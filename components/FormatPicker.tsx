// FormatPicker.tsx (React/React Native Web)
import React, { useState } from "react";
import { FORMAT_PRESETS, AspectKey, composePrompt, Mode } from "@/lib/promptFormats";

type Props = {
  mode: Mode;                         // "generate" | "edit"
  onPromptReady: (prompt: string) => void;
};

export const FormatPicker: React.FC<Props> = ({ mode, onPromptReady }) => {
  const [aspect, setAspect] = useState<AspectKey>("4_5");
  const [extendBg, setExtendBg] = useState(true);
  const [strict, setStrict] = useState(false);
  const [base, setBase] = useState(
    mode === "generate"
      ? "A photorealistic portrait in soft natural light, calm mood."
      : "Maintain the same subject and overall style from the uploaded image."
  );

  const onBuild = () => {
    const prompt = composePrompt(base, mode, aspect, {
      extendBg,
      strictConsistency: strict,
    });
    onPromptReady(prompt);
  };

  const options = Object.entries(FORMAT_PRESETS) as [AspectKey, typeof FORMAT_PRESETS[AspectKey]][];

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <label>
        <div>Base Prompt</div>
        <textarea
          value={base}
          onChange={(e) => setBase(e.target.value)}
          rows={4}
          style={{ width: "100%" }}
          placeholder="Beschreibe Szene/Stil/Stimmung…"
        />
      </label>

      <label>
        <div>Format</div>
        <select
          value={aspect}
          onChange={(e) => setAspect(e.target.value as AspectKey)}
          style={{ width: "100%", padding: 8 }}
        >
          {options.map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {mode === "edit" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={extendBg}
            onChange={(e) => setExtendBg(e.target.checked)}
          />
          Hintergrund natürlich erweitern (bei neuem Format)
        </label>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={strict}
          onChange={(e) => setStrict(e.target.checked)}
        />
        Strikte Konsistenz (Gesicht/Produkt unverändert)
      </label>

      <button onClick={onBuild} style={{ padding: "10px 14px" }}>
        Prompt bauen
      </button>
    </div>
  );
};
