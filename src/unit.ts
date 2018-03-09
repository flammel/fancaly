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

export function isUnit(a: any): a is Unit {
  return typeof a === "object" && a.type === "Unit";
}
