# Core model

```text
Workspace ──< Membership
Workspace ──< Project ──< ProductionPlan ──< Scene ──< Shot
                                │                 ├──< Character
                                │                 └──< Location
Project ──< Job
Project ──< ActivityEvent
```

The project brief is the source of intent. A plan is the director's proposed execution. Future generated assets attach to shots, never replace the plan.
