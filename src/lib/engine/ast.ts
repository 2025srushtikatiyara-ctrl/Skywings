/**
 * Abstract Syntax Tree (AST) definitions for SKY WINGS SQL Engine
 */

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression
  | FunctionCallExpression
  | InExpression
  | BetweenExpression
  | LikeExpression
  | IsNullExpression
  | StarExpression;

export interface StarExpression {
  type: 'STAR';
  tablePrefix?: string;
}

export interface LiteralExpression {
  type: 'LITERAL';
  value: string | number | boolean | null;
}

export interface IdentifierExpression {
  type: 'IDENTIFIER';
  name: string;
  table?: string;
}

export interface BinaryExpression {
  type: 'BINARY';
  operator: string; // '=', '!=', '<>', '<', '<=', '>', '>=', 'AND', 'OR', '+', '-', '*', '/'
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: 'UNARY';
  operator: 'NOT' | '-';
  argument: Expression;
}

export interface FunctionCallExpression {
  type: 'FUNCTION_CALL';
  name: string; // 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'
  isDistinct?: boolean;
  arguments: Expression[];
}

export interface InExpression {
  type: 'IN';
  expression: Expression;
  values: Expression[];
  isNot: boolean;
}

export interface BetweenExpression {
  type: 'BETWEEN';
  expression: Expression;
  lower: Expression;
  upper: Expression;
  isNot: boolean;
}

export interface LikeExpression {
  type: 'LIKE';
  expression: Expression;
  pattern: Expression;
  isNot: boolean;
}

export interface IsNullExpression {
  type: 'IS_NULL';
  expression: Expression;
  isNot: boolean;
}

export interface SelectColumn {
  expression: Expression;
  alias?: string;
}

export interface JoinClause {
  type: 'INNER' | 'LEFT';
  table: string;
  alias?: string;
  on: Expression;
}

export interface OrderByClause {
  expression: Expression;
  direction: 'ASC' | 'DESC';
}

export interface SelectStatement {
  type: 'SELECT';
  isDistinct?: boolean;
  columns: SelectColumn[];
  fromTable?: string;
  fromAlias?: string;
  joins?: JoinClause[];
  where?: Expression;
  groupBy?: Expression[];
  having?: Expression;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
}

export interface InsertStatement {
  type: 'INSERT';
  table: string;
  columns?: string[];
  values: Expression[][];
}

export interface UpdateAssignment {
  column: string;
  value: Expression;
}

export interface UpdateStatement {
  type: 'UPDATE';
  table: string;
  assignments: UpdateAssignment[];
  where?: Expression;
}

export interface DeleteStatement {
  type: 'DELETE';
  table: string;
  where?: Expression;
}

export interface ColumnDefinition {
  name: string;
  dataType: string;
  isPrimary?: boolean;
  nullable?: boolean;
  defaultValue?: any;
}

export interface CreateTableStatement {
  type: 'CREATE_TABLE';
  table: string;
  columns: ColumnDefinition[];
  ifNotExists?: boolean;
}

export interface AlterTableStatement {
  type: 'ALTER_TABLE';
  table: string;
  operation: 'ADD_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN';
  columnDefinition?: ColumnDefinition;
  columnName?: string;
  newColumnName?: string;
}

export interface DropTableStatement {
  type: 'DROP_TABLE';
  table: string;
  ifExists?: boolean;
}

export interface ShowTablesStatement {
  type: 'SHOW_TABLES';
}

export interface DescribeStatement {
  type: 'DESCRIBE';
  table: string;
}

export interface ExplainStatement {
  type: 'EXPLAIN';
  statement: Statement;
  analyze?: boolean;
}

export type Statement =
  | SelectStatement
  | InsertStatement
  | UpdateStatement
  | DeleteStatement
  | CreateTableStatement
  | AlterTableStatement
  | DropTableStatement
  | ShowTablesStatement
  | DescribeStatement
  | ExplainStatement;
