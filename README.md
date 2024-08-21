# glab

(Pronounced gee-lab)

Tool for GitLab reporting

### How To

Set

- `$ACCOUNT`
- `$PROJECT1`
- `$PROJECT2`

And run this command to see the merged MRs for the user since the target date

```
 node openMRs.js $ACCOUNT merged $PROJECT1 $PROJECT2 2024-07-21 --md
```
