-- ============================================================================
-- Migration 003: Real-Time Event Notification Triggers
-- Sends compact JSON notifications via pg_notify for LISTEN/NOTIFY listeners
-- (Ensures external database writes like pgAdmin are instantly detected)
-- ============================================================================

CREATE OR REPLACE FUNCTION skywings_notify_event() 
RETURNS TRIGGER AS $$
DECLARE
    notification json;
    primary_key_val text := '';
BEGIN
    IF (TG_OP = 'DELETE') THEN
        notification = json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'timestamp', CURRENT_TIMESTAMP
        );
    ELSE
        notification = json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'timestamp', CURRENT_TIMESTAMP
        );
    END IF;

    -- Publish compact payload on skywings_channel
    PERFORM pg_notify('skywings_channel', notification::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers safely if not already existing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_flights_notify') THEN
        CREATE TRIGGER trg_flights_notify
        AFTER INSERT OR UPDATE OR DELETE ON flights
        FOR EACH ROW EXECUTE FUNCTION skywings_notify_event();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_notify') THEN
        CREATE TRIGGER trg_bookings_notify
        AFTER INSERT OR UPDATE OR DELETE ON bookings
        FOR EACH ROW EXECUTE FUNCTION skywings_notify_event();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_passengers_notify') THEN
        CREATE TRIGGER trg_passengers_notify
        AFTER INSERT OR UPDATE OR DELETE ON passengers
        FOR EACH ROW EXECUTE FUNCTION skywings_notify_event();
    END IF;
END $$;
