export interface Unit {
  type: "Unit";
  name: string;
}

export const units: Unit[] = [
  { type: "Unit", name: "km" },
  { type: "Unit", name: "m" },
  { type: "Unit", name: "cm" },
  { type: "Unit", name: "mm" },
  { type: "Unit", name: "ft" },
  { type: "Unit", name: "in" },
  { type: "Unit", name: "mile" },
  { type: "Unit", name: "unitless" },
];

export function unitless(): Unit {
  return { type: "Unit", name: "unitless" };
}

export function getUnit(name: string): Unit {
  return { type: "Unit", name };
}

export function unitNames(): string[] {
  const names = [];
  for (const a of units) {
    names.push(a.name);
  }
  return names;
}
