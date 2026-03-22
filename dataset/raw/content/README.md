# Content Overrides

This directory is for optional writer-facing text overrides that sit on top of the
canonical observations in the dataset pipeline.

Each JSON file should contain either:

- a list of records, or
- an object whose values are records

Each record should include:

- `dimension`
- `subject_key`

And can include:

- `summary_short`
- `description_medium`
- `description_long`
- `hook`
- `caveats`
- `facts`
- `content_status`
- `content_origin`

The builder uses these files to populate `observation_content` rows and writer-packet
exports without making the frontend YAML the source of truth.
