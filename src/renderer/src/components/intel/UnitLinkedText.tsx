import React, { useMemo } from 'react';
import { buildUnitMentionIndex, linkUnitMentions } from '../../../../core/intel/unit-mentions';
import { useSnapshot } from '../../stores';

/** `#/units/<unitId>` opens that unit's dossier in the catalog (T10.2). */
export const unitHref = (unitId: string): string => `#/units/${unitId}`;

export function UnitLink({ unitId, children }: { unitId: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <a href={unitHref(unitId)} data-testid={`unit-link-${unitId}`} className="text-[#38bdf8] underline decoration-dotted underline-offset-2 hover:text-white">
      {children}
    </a>
  );
}

/** Text with unit ids and exact current unit names linked to the catalog; nothing else is guessed. */
export function UnitLinkedText({ text }: { text: string }): React.JSX.Element {
  const snapshot = useSnapshot((s) => s.snapshot);
  const index = useMemo(() => buildUnitMentionIndex(snapshot?.units ?? []), [snapshot]);
  const parts = useMemo(() => linkUnitMentions(text, index), [text, index]);
  return (
    <>
      {parts.map((p, i) =>
        p.unitId ? (
          <UnitLink key={i} unitId={p.unitId}>
            {p.text}
          </UnitLink>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        )
      )}
    </>
  );
}
