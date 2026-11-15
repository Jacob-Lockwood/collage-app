const constructorFieldMap = new Map<Function, Set<string>>();
let fields = new Set<string>();

/** mark a class as serializable */
export function serialize(Target: Function, _context: ClassDecoratorContext) {
  const SuperClass = Object.getPrototypeOf(Target);
  for (const field of constructorFieldMap.get(SuperClass) ?? [])
    fields.add(field);
  constructorFieldMap.set(Target, fields);
  fields = new Set();
}
/** mark a field as serializable */
export function data(_target: unknown, context: ClassFieldDecoratorContext) {
  fields.add(context.name.toString());
}

/** json encode, preserving serializable classes */
export function toJSON(value: unknown) {
  const replacer = (value: unknown) => {
    if (
      typeof value !== "object" ||
      value == null ||
      !constructorFieldMap.has(value.constructor)
    )
      return value;
    const o: Record<string, unknown> = { _class: value.constructor.name };
    for (const field of constructorFieldMap.get(value.constructor)!) {
      o[field] = replacer(value[field as keyof typeof value]);
    }
    return o;
  };
  return JSON.stringify(value, (_key, val: unknown) => replacer(val));
}
/** json decode, restoring serializable classes */
export function fromJSON<T = unknown>(json: string): T {
  return JSON.parse(json, (_key, value: unknown) => {
    if (typeof value !== "object" || value == null || !("_class" in value))
      return value;
    for (const [Class, fields] of constructorFieldMap.entries()) {
      if (value._class !== Class.name) continue;
      const descriptor: PropertyDescriptorMap = {};
      for (const field of fields) {
        descriptor[field] = {
          value: value[field as keyof typeof value],
          writable: true,
        };
      }
      const o = Object.create(Class.prototype, descriptor);
      return o;
    }
    throw new Error("unrecognized _class: " + value._class);
  });
}
