# MVP — Production Planning Workspace

## User outcome

A creator can create a workspace, open a project, describe a video idea, and receive a reviewable production plan. They can refine the brief, approve scenes and shots, and see what work is pending.

## In scope

1. Email authentication and workspace creation
2. Project dashboard and project brief editor
3. Director planning run with structured output
4. Editable character, location, scene and shot records
5. Approval status, comments and activity log
6. Background-job status screen

## Explicitly deferred

- Video/image/audio generation providers
- Automated clip continuity or final rendering
- Billing, public sharing and team roles beyond owner/editor/viewer
- Marketplace or template library

## First vertical slice

`Create project → save brief → request plan → inspect a mocked plan → approve one scene`.

The mocked plan validates the user experience while the LLM workflow is developed behind the same `DirectorPlanner` interface.
