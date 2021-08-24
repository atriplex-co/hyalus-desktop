package models

import "time"

type Limit struct {
	Scope   string
	Count   int64
	Expires time.Time
}
