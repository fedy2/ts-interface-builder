export const ICacheItem = t.iface([], [
  t.prop("key", "string"),
  t.prop("value", "any"),
  t.prop("size", "number"),
  t.prop("tag", "string", t.opt),
]);

export const ILRUCache = t.iface([], [
  t.prop("capacity", "number"),
  t.prop("set", t.func("boolean", t.param("item", "ICacheItem"), t.param("overwrite", "boolean", t.opt))),
  t.prop("get", t.func("ICacheItem", t.param("key", "string"))),
]);

export const MyType = t.union("boolean", "number", "ILRUCache");

export const ISampling = t.iface(["ICacheItem"], [
  t.prop("xstring", "string"),
  t.prop("xstring2", "string"),
  t.prop("xany", "any"),
  t.prop("xnumber", "number"),
  t.prop("xnumber2", "number", t.opt),
  t.prop("xnull", "null"),
  t.prop("xMyType", "MyType"),
  t.prop("xarray", t.array("string")),
  t.prop("xarray2", t.array("MyType")),
  t.prop("xtuple", t.tuple("string", "number")),
  t.prop("xunion", t.union("number", "null")),
  t.prop("xiface", t.iface([], [
    t.prop("foo", "string"),
    t.prop("bar", "number"),
  ])),
  t.prop("xfunc", t.func("number", t.param("price", "number"), t.param("quantity", "number"))),
  t.prop("xfunc2", t.func("number", t.param("price", "number"), t.param("quantity", "number", t.opt))),
]);