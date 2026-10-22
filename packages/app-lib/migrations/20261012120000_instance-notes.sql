CREATE TABLE instance_notes (
	instance_id TEXT NOT NULL,
	notes TEXT NOT NULL DEFAULT '',

	PRIMARY KEY (instance_id),
	FOREIGN KEY (instance_id) REFERENCES instances (id)
		ON DELETE CASCADE
);
