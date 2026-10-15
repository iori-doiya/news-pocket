-- Keep the model used for each measurement, even after a summary is replaced.
ALTER TABLE summary_metrics ADD COLUMN model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
