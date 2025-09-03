# Patch: Generator always visible + test reset

- Home generator UI is **always visible**.
- Free preview gating only affects whether the **Generate** call consumes the local free or server credits.
- Testing helpers:
  - Append `?resetFree=1` to the home URL to reset the local free counter.
  - Or set `NEXT_PUBLIC_ALLOW_TEST_RESET=1` and click the **Reset free** button.
  - (Optional) Set `ALLOW_DEV_RESET=1` and call `POST /api/dev/reset-credits` with the user's Bearer token to reset server credits to 100.

## Env vars
```
NEXT_PUBLIC_ALLOW_TEST_RESET=1   # show reset button on Home (client side)
ALLOW_DEV_RESET=1                # allow /api/dev/reset-credits (server side)
```
