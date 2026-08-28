CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
    'caterwise-daily-sales-reminder',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'GANTI_DENGAN_URL_PRODUKSI/api/reminders/daily-sales',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer GANTI_DENGAN_REMINDER_SECRET"}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);
