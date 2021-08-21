#!/bin/sh
tmux a -t hyalus && exit
tmux new -ds hyalus 'cd frontend; yarn; yarn dev'
tmux split-window -t hyalus 'cd server; while :; do find | entr -dr sh -c "pkill -x server; go run ."; done'
tmux a -t hyalus
