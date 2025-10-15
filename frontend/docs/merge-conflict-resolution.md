# Resolving Admin Match Making Merge Conflicts

When merging the `codex/implement-moderator-functionalities-for-matches-tk2l9d` feature work into `main`,
you may see conflict markers like:

```
<<<<<<< codex/implement-moderator-functionalities-for-matches-tk2l9d
// new feature code
=======
// legacy main branch code
>>>>>>> main
```

Always **keep the code from the feature branch** (the section between `<<<<<<<` and `=======`) because it
contains the finalized roster selection, match making, and tournament launch logic. After you keep that
section, delete everything between the divider line (`=======`) and the closing marker (`>>>>>>> main`). The
code below `=======` reflects the pre-feature implementation that lacks these capabilities, so it should be
removed along with the conflict markers.

Steps to resolve:

1. Delete the legacy section and the conflict markers, leaving only the updated feature code.
2. Confirm the file compiles locally (`npm run build`) and linting passes (`npm run lint`).
3. Stage the cleaned files and continue with the merge or cherry-pick.

Following these steps preserves the intended functionality while keeping the Git history clean.
