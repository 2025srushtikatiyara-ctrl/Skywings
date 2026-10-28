/**
 * Recursive Descent SQL Parser for SKY WINGS Browser Engine
 * Converts tokens into a strongly-typed Statement AST.
 */

import { Token, tokenize } from './tokenizer';
import {
  Statement,
  SelectStatement,
  SelectColumn,
  Expression,
  JoinClause,
  OrderByClause,
  InsertStatement,
  UpdateStatement,
  UpdateAssignment,
  DeleteStatement,
  CreateTableStatement,
  ColumnDefinition,
  AlterTableStatement,
  DropTableStatement,
  ShowTablesStatement,
  DescribeStatement,
  ExplainStatement,
} from './ast';

export class ParserError extends Error {
  constructor(message: string, public pos?: number) {
    super(pos !== undefined ? `SQL Error at position ${pos}: ${message}` : `SQL Error: ${message}`);
    this.name = 'ParserError';
  }
}

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Statement {
    if (this.isAtEnd()) {
      throw new ParserError('Empty SQL query');
    }

    const token = this.peek();

    if (this.matchKeyword('EXPLAIN')) {
      const analyze = this.matchKeyword('ANALYZE');
      const inner = this.parse();
      return {
        type: 'EXPLAIN',
        statement: inner,
        analyze,
      } as ExplainStatement;
    }

    if (this.matchKeyword('SHOW')) {
      if (this.matchKeyword('TABLES')) {
        this.consumeSemicolon();
        return { type: 'SHOW_TABLES' };
      }
      throw new ParserError(`Expected TABLES after SHOW, got ${this.peek().value}`);
    }

    if (this.matchKeyword('DESCRIBE') || this.matchKeyword('DESC')) {
      const table = this.consumeIdentifier('Expected table name after DESCRIBE');
      this.consumeSemicolon();
      return { type: 'DESCRIBE', table };
    }

    if (this.matchKeyword('SELECT')) {
      return this.parseSelect();
    }

    if (this.matchKeyword('INSERT')) {
      return this.parseInsert();
    }

    if (this.matchKeyword('UPDATE')) {
      return this.parseUpdate();
    }

    if (this.matchKeyword('DELETE')) {
      return this.parseDelete();
    }

    if (this.matchKeyword('CREATE')) {
      return this.parseCreate();
    }

    if (this.matchKeyword('ALTER')) {
      return this.parseAlter();
    }

    if (this.matchKeyword('DROP')) {
      return this.parseDrop();
    }

    throw new ParserError(`Unsupported SQL statement starting with '${token.value}'`);
  }

  // --- SELECT PARSING ---
  private parseSelect(): SelectStatement {
    const isDistinct = this.matchKeyword('DISTINCT');
    const columns: SelectColumn[] = [];

    do {
      if (this.matchToken('STAR', '*')) {
        columns.push({
          expression: { type: 'STAR' },
        });
      } else {
        const expr = this.parseExpression();
        let alias: string | undefined;
        if (this.matchKeyword('AS')) {
          alias = this.consumeIdentifierOrString('Expected column alias after AS');
        } else if (this.check('IDENTIFIER')) {
          alias = this.advance().value;
        }
        columns.push({ expression: expr, alias });
      }
    } while (this.matchPunctuation(','));

    let fromTable: string | undefined;
    let fromAlias: string | undefined;
    const joins: JoinClause[] = [];

    if (this.matchKeyword('FROM')) {
      fromTable = this.consumeIdentifier('Expected table name after FROM');
      if (this.matchKeyword('AS')) {
        fromAlias = this.consumeIdentifier('Expected table alias after AS');
      } else if (this.check('IDENTIFIER') && !this.isClauseStart()) {
        fromAlias = this.advance().value;
      }

      // Joins
      while (this.checkKeyword('JOIN') || this.checkKeyword('INNER') || this.checkKeyword('LEFT')) {
        let joinType: 'INNER' | 'LEFT' = 'INNER';
        if (this.matchKeyword('LEFT')) {
          this.matchKeyword('OUTER');
          this.consumeKeyword('JOIN', "Expected 'JOIN' after 'LEFT'");
          joinType = 'LEFT';
        } else if (this.matchKeyword('INNER')) {
          this.consumeKeyword('JOIN', "Expected 'JOIN' after 'INNER'");
          joinType = 'INNER';
        } else {
          this.consumeKeyword('JOIN', 'Expected JOIN');
        }

        const joinTable = this.consumeIdentifier('Expected joined table name');
        let joinAlias: string | undefined;
        if (this.matchKeyword('AS')) {
          joinAlias = this.consumeIdentifier('Expected alias after AS');
        } else if (this.check('IDENTIFIER') && !this.checkKeyword('ON')) {
          joinAlias = this.advance().value;
        }

        this.consumeKeyword('ON', 'Expected ON after JOIN condition');
        const onCondition = this.parseExpression();

        joins.push({
          type: joinType,
          table: joinTable,
          alias: joinAlias,
          on: onCondition,
        });
      }
    }

    // WHERE
    let where: Expression | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpression();
    }

    // GROUP BY
    let groupBy: Expression[] | undefined;
    if (this.matchKeyword('GROUP')) {
      this.consumeKeyword('BY', "Expected 'BY' after 'GROUP'");
      groupBy = [];
      do {
        groupBy.push(this.parseExpression());
      } while (this.matchPunctuation(','));
    }

    // HAVING
    let having: Expression | undefined;
    if (this.matchKeyword('HAVING')) {
      having = this.parseExpression();
    }

    // ORDER BY
    let orderBy: OrderByClause[] | undefined;
    if (this.matchKeyword('ORDER')) {
      this.consumeKeyword('BY', "Expected 'BY' after 'ORDER'");
      orderBy = [];
      do {
        const expr = this.parseExpression();
        let direction: 'ASC' | 'DESC' = 'ASC';
        if (this.matchKeyword('DESC')) {
          direction = 'DESC';
        } else {
          this.matchKeyword('ASC');
        }
        orderBy.push({ expression: expr, direction });
      } while (this.matchPunctuation(','));
    }

    // LIMIT & OFFSET
    let limit: number | undefined;
    let offset: number | undefined;
    if (this.matchKeyword('LIMIT')) {
      const numTok = this.consume('NUMBER', 'Expected number after LIMIT');
      limit = parseInt(numTok.value, 10);
    }
    if (this.matchKeyword('OFFSET')) {
      const numTok = this.consume('NUMBER', 'Expected number after OFFSET');
      offset = parseInt(numTok.value, 10);
    }

    this.consumeSemicolon();

    return {
      type: 'SELECT',
      isDistinct,
      columns,
      fromTable,
      fromAlias,
      joins: joins.length > 0 ? joins : undefined,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset,
    };
  }

  // --- INSERT PARSING ---
  private parseInsert(): InsertStatement {
    this.consumeKeyword('INTO', "Expected 'INTO' after 'INSERT'");
    const table = this.consumeIdentifier('Expected table name');

    let columns: string[] | undefined;
    if (this.matchPunctuation('(')) {
      columns = [];
      do {
        columns.push(this.consumeIdentifier('Expected column name'));
      } while (this.matchPunctuation(','));
      this.consumePunctuation(')', "Expected ')' after column list");
    }

    this.consumeKeyword('VALUES', "Expected 'VALUES' after table/column declaration");

    const allValues: Expression[][] = [];
    do {
      this.consumePunctuation('(', "Expected '(' before values list");
      const rowValues: Expression[] = [];
      do {
        rowValues.push(this.parseExpression());
      } while (this.matchPunctuation(','));
      this.consumePunctuation(')', "Expected ')' after values list");
      allValues.push(rowValues);
    } while (this.matchPunctuation(','));

    this.consumeSemicolon();
    return {
      type: 'INSERT',
      table,
      columns,
      values: allValues,
    };
  }

  // --- UPDATE PARSING ---
  private parseUpdate(): UpdateStatement {
    const table = this.consumeIdentifier('Expected table name after UPDATE');
    this.consumeKeyword('SET', "Expected 'SET' after table name in UPDATE");

    const assignments: UpdateAssignment[] = [];
    do {
      const column = this.consumeIdentifier('Expected column name in assignment');
      this.consumeOperator('=', "Expected '=' in assignment");
      const value = this.parseExpression();
      assignments.push({ column, value });
    } while (this.matchPunctuation(','));

    let where: Expression | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpression();
    }

    this.consumeSemicolon();
    return {
      type: 'UPDATE',
      table,
      assignments,
      where,
    };
  }

  // --- DELETE PARSING ---
  private parseDelete(): DeleteStatement {
    this.consumeKeyword('FROM', "Expected 'FROM' after 'DELETE'");
    const table = this.consumeIdentifier('Expected table name in DELETE');

    let where: Expression | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpression();
    }

    this.consumeSemicolon();
    return {
      type: 'DELETE',
      table,
      where,
    };
  }

  // --- CREATE TABLE PARSING ---
  private parseCreate(): CreateTableStatement {
    this.consumeKeyword('TABLE', "Expected 'TABLE' after 'CREATE'");
    let ifNotExists = false;
    if (this.matchKeyword('IF')) {
      this.consumeKeyword('NOT', "Expected 'NOT' after 'IF'");
      this.consumeKeyword('EXISTS', "Expected 'EXISTS' after 'NOT'");
      ifNotExists = true;
    }

    const table = this.consumeIdentifier('Expected table name');
    this.consumePunctuation('(', "Expected '(' before column definitions");

    const columns: ColumnDefinition[] = [];
    do {
      const colName = this.consumeIdentifier('Expected column name');
      const dataType = this.consumeDataType();

      let isPrimary = false;
      let nullable = true;
      let defaultValue: any = undefined;

      while (!this.checkPunctuation(',') && !this.checkPunctuation(')')) {
        if (this.matchKeyword('PRIMARY')) {
          this.consumeKeyword('KEY', "Expected 'KEY' after 'PRIMARY'");
          isPrimary = true;
          nullable = false;
        } else if (this.matchKeyword('NOT')) {
          this.consumeKeyword('NULL', "Expected 'NULL' after 'NOT'");
          nullable = false;
        } else if (this.matchKeyword('NULL')) {
          nullable = true;
        } else if (this.matchKeyword('DEFAULT')) {
          const defaultExpr = this.parseExpression();
          if (defaultExpr.type === 'LITERAL') {
            defaultValue = defaultExpr.value;
          }
        } else {
          this.advance(); // skip other constraints like UNIQUE or CHECK
        }
      }

      columns.push({
        name: colName,
        dataType,
        isPrimary,
        nullable,
        defaultValue,
      });
    } while (this.matchPunctuation(','));

    this.consumePunctuation(')', "Expected ')' after column definitions");
    this.consumeSemicolon();

    return {
      type: 'CREATE_TABLE',
      table,
      columns,
      ifNotExists,
    };
  }

  // --- ALTER TABLE PARSING ---
  private parseAlter(): AlterTableStatement {
    this.consumeKeyword('TABLE', "Expected 'TABLE' after 'ALTER'");
    const table = this.consumeIdentifier('Expected table name');

    if (this.matchKeyword('ADD')) {
      this.matchKeyword('COLUMN');
      const colName = this.consumeIdentifier('Expected column name');
      const dataType = this.consumeDataType();
      this.consumeSemicolon();
      return {
        type: 'ALTER_TABLE',
        table,
        operation: 'ADD_COLUMN',
        columnDefinition: {
          name: colName,
          dataType,
        },
      };
    }

    if (this.matchKeyword('DROP')) {
      this.matchKeyword('COLUMN');
      const colName = this.consumeIdentifier('Expected column name to drop');
      this.consumeSemicolon();
      return {
        type: 'ALTER_TABLE',
        table,
        operation: 'DROP_COLUMN',
        columnName: colName,
      };
    }

    if (this.matchKeyword('RENAME')) {
      this.matchKeyword('COLUMN');
      const oldName = this.consumeIdentifier('Expected old column name');
      this.consumeKeyword('TO', "Expected 'TO' after column name");
      const newName = this.consumeIdentifier('Expected new column name');
      this.consumeSemicolon();
      return {
        type: 'ALTER_TABLE',
        table,
        operation: 'RENAME_COLUMN',
        columnName: oldName,
        newColumnName: newName,
      };
    }

    throw new ParserError(`Unsupported ALTER TABLE operation on table '${table}'`);
  }

  // --- DROP TABLE PARSING ---
  private parseDrop(): DropTableStatement {
    this.consumeKeyword('TABLE', "Expected 'TABLE' after 'DROP'");
    let ifExists = false;
    if (this.matchKeyword('IF')) {
      this.consumeKeyword('EXISTS', "Expected 'EXISTS' after 'IF'");
      ifExists = true;
    }
    const table = this.consumeIdentifier('Expected table name in DROP TABLE');
    this.consumeSemicolon();
    return {
      type: 'DROP_TABLE',
      table,
      ifExists,
    };
  }

  // --- EXPRESSION PARSING (PRECEDENCE CLIMBER) ---
  public parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let expr = this.parseAnd();
    while (this.matchKeyword('OR')) {
      const right = this.parseAnd();
      expr = {
        type: 'BINARY',
        operator: 'OR',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseAnd(): Expression {
    let expr = this.parseNot();
    while (this.matchKeyword('AND')) {
      const right = this.parseNot();
      expr = {
        type: 'BINARY',
        operator: 'AND',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseNot(): Expression {
    if (this.matchKeyword('NOT')) {
      const argument = this.parseNot();
      return {
        type: 'UNARY',
        operator: 'NOT',
        argument,
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let expr = this.parseAdditive();

    // IS NULL / IS NOT NULL
    if (this.matchKeyword('IS')) {
      const isNot = this.matchKeyword('NOT');
      this.consumeKeyword('NULL', "Expected 'NULL' after 'IS [NOT]'");
      return {
        type: 'IS_NULL',
        expression: expr,
        isNot,
      };
    }

    // IN / NOT IN
    let isNotIn = false;
    let hasIn = false;
    if (this.matchKeyword('NOT')) {
      this.consumeKeyword('IN', "Expected 'IN' after 'NOT'");
      isNotIn = true;
      hasIn = true;
    } else if (this.matchKeyword('IN')) {
      hasIn = true;
    }
    if (hasIn) {
      this.consumePunctuation('(', "Expected '(' after IN");
      const values: Expression[] = [];
      do {
        values.push(this.parseExpression());
      } while (this.matchPunctuation(','));
      this.consumePunctuation(')', "Expected ')' after IN list");
      return {
        type: 'IN',
        expression: expr,
        values,
        isNot: isNotIn,
      };
    }

    // BETWEEN / NOT BETWEEN
    let isNotBetween = false;
    let hasBetween = false;
    if (this.matchKeyword('NOT')) {
      this.consumeKeyword('BETWEEN', "Expected 'BETWEEN' after 'NOT'");
      isNotBetween = true;
      hasBetween = true;
    } else if (this.matchKeyword('BETWEEN')) {
      hasBetween = true;
    }
    if (hasBetween) {
      const lower = this.parseAdditive();
      this.consumeKeyword('AND', "Expected 'AND' in BETWEEN clause");
      const upper = this.parseAdditive();
      return {
        type: 'BETWEEN',
        expression: expr,
        lower,
        upper,
        isNot: isNotBetween,
      };
    }

    // LIKE / NOT LIKE
    let isNotLike = false;
    let hasLike = false;
    if (this.matchKeyword('NOT')) {
      this.consumeKeyword('LIKE', "Expected 'LIKE' after 'NOT'");
      isNotLike = true;
      hasLike = true;
    } else if (this.matchKeyword('LIKE')) {
      hasLike = true;
    }
    if (hasLike) {
      const pattern = this.parseAdditive();
      return {
        type: 'LIKE',
        expression: expr,
        pattern,
        isNot: isNotLike,
      };
    }

    // Standard Comparison Operators (=, !=, <>, <, <=, >, >=)
    if (this.check('OPERATOR') && ['=', '!=', '<>', '<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      return {
        type: 'BINARY',
        operator: op,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();
    while (this.check('OPERATOR') && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      expr = {
        type: 'BINARY',
        operator: op,
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseMultiplicative(): Expression {
    let expr = this.parsePrimary();
    while ((this.check('OPERATOR') && this.peek().value === '/') || this.check('STAR')) {
      const op = this.advance().value;
      const right = this.parsePrimary();
      expr = {
        type: 'BINARY',
        operator: op,
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parsePrimary(): Expression {
    // Unary minus
    if (this.check('OPERATOR') && this.peek().value === '-') {
      this.advance();
      const arg = this.parsePrimary();
      return {
        type: 'UNARY',
        operator: '-',
        argument: arg,
      };
    }

    // Numbers
    if (this.check('NUMBER')) {
      const tok = this.advance();
      const val = tok.value.includes('.') ? parseFloat(tok.value) : parseInt(tok.value, 10);
      return { type: 'LITERAL', value: val };
    }

    // Strings
    if (this.check('STRING')) {
      const tok = this.advance();
      return { type: 'LITERAL', value: tok.value };
    }

    // Boolean / Null literals
    if (this.matchKeyword('TRUE')) return { type: 'LITERAL', value: true };
    if (this.matchKeyword('FALSE')) return { type: 'LITERAL', value: false };
    if (this.matchKeyword('NULL')) return { type: 'LITERAL', value: null };

    // Function calls: COUNT, SUM, AVG, MIN, MAX
    if (this.check('KEYWORD') && ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(this.peek().value)) {
      const fnName = this.advance().value;
      this.consumePunctuation('(', `Expected '(' after ${fnName}`);
      const isDistinct = this.matchKeyword('DISTINCT');
      const args: Expression[] = [];
      if (this.matchToken('STAR', '*')) {
        args.push({ type: 'STAR' });
      } else {
        args.push(this.parseExpression());
      }
      this.consumePunctuation(')', `Expected ')' after ${fnName} arguments`);
      return {
        type: 'FUNCTION_CALL',
        name: fnName,
        isDistinct,
        arguments: args,
      };
    }

    // Parenthesized expression: (expr)
    if (this.matchPunctuation('(')) {
      const expr = this.parseExpression();
      this.consumePunctuation(')', "Expected ')' after expression");
      return expr;
    }

    // Identifiers (e.g. `col` or `table.col`)
    if (this.check('IDENTIFIER') || (this.check('KEYWORD') && !this.isClauseStart())) {
      const first = this.advance().value;
      if (this.matchPunctuation('.')) {
        if (this.matchToken('STAR', '*')) {
          return { type: 'STAR', tablePrefix: first };
        }
        const col = this.consumeIdentifier('Expected column name after table prefix');
        return { type: 'IDENTIFIER', name: col, table: first };
      }
      return { type: 'IDENTIFIER', name: first };
    }

    throw new ParserError(`Unexpected token '${this.peek().value}' in expression`);
  }

  // --- HELPER METHODS ---
  private consumeDataType(): string {
    if (this.check('KEYWORD')) {
      const type = this.advance().value;
      if (this.matchPunctuation('(')) {
        this.consume('NUMBER', 'Expected type precision length');
        this.matchPunctuation(',');
        if (this.check('NUMBER')) this.advance();
        this.consumePunctuation(')', "Expected ')' after type precision");
      }
      return type;
    }
    if (this.check('IDENTIFIER')) {
      return this.advance().value;
    }
    return 'VARCHAR';
  }

  private isClauseStart(): boolean {
    if (!this.check('KEYWORD')) return false;
    const v = this.peek().value;
    return ['WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'INNER', 'LEFT', 'FROM', 'UNION'].includes(v);
  }

  private matchKeyword(kw: string): boolean {
    if (this.checkKeyword(kw)) {
      this.advance();
      return true;
    }
    return false;
  }

  private checkKeyword(kw: string): boolean {
    return this.check('KEYWORD') && this.peek().value.toUpperCase() === kw.toUpperCase();
  }

  private consumeKeyword(kw: string, errorMsg: string): Token {
    if (this.checkKeyword(kw)) {
      return this.advance();
    }
    throw new ParserError(errorMsg, this.peek().pos);
  }

  private matchToken(type: string, val?: string): boolean {
    if (this.check(type as any) && (val === undefined || this.peek().value === val)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchPunctuation(p: string): boolean {
    return this.matchToken('PUNCTUATION', p);
  }

  private checkPunctuation(p: string): boolean {
    return this.check('PUNCTUATION') && this.peek().value === p;
  }

  private consumePunctuation(p: string, errorMsg: string): Token {
    if (this.check('PUNCTUATION') && this.peek().value === p) {
      return this.advance();
    }
    throw new ParserError(errorMsg, this.peek().pos);
  }

  private consumeOperator(op: string, errorMsg: string): Token {
    if (this.check('OPERATOR') && this.peek().value === op) {
      return this.advance();
    }
    throw new ParserError(errorMsg, this.peek().pos);
  }

  private consumeIdentifier(errorMsg: string): string {
    if (this.check('IDENTIFIER')) {
      return this.advance().value;
    }
    if (this.check('KEYWORD') && !this.isClauseStart()) {
      return this.advance().value;
    }
    throw new ParserError(errorMsg, this.peek().pos);
  }

  private consumeIdentifierOrString(errorMsg: string): string {
    if (this.check('IDENTIFIER') || this.check('STRING')) {
      return this.advance().value;
    }
    throw new ParserError(errorMsg, this.peek().pos);
  }

  private consume(type: string, errorMsg: string): Token {
    if (this.check(type as any)) {
      return this.advance();
    }
    throw new ParserError(errorMsg, this.peek().pos);
  }

  private consumeSemicolon() {
    this.matchPunctuation(';');
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

export function parseSql(sql: string): Statement {
  const tokens = tokenize(sql);
  const parser = new Parser(tokens);
  return parser.parse();
}
