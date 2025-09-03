# Patch: restore missing modules

This zip restores the exact modules your build is missing:

- `app/presets.ts`
- `components/BeforeAfter.tsx`

Your `app/page.tsx` imports should compile with:

```ts
import { PRESETS, type Species } from "@/app/presets";
import BeforeAfter from "@/components/BeforeAfter";
```

If you **do not** use the `@/*` alias, either:

1) Add it to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["*"] }
  }
}
```

2) OR change your imports in `app/page.tsx` to **relative**:
```ts
import { PRESETS, type Species } from "./presets";
import BeforeAfter from "../components/BeforeAfter";
```

I've included `app/page.relative-imports.example.tsx` to show the relative paths.
