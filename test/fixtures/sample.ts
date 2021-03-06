interface ICacheItem {
  key: string;
  value: any;
  size: number;
  tag?: string;
}

interface ILRUCache {
  capacity: number;
  set(item: ICacheItem, overwrite?: boolean): boolean;
  get(key: string): ICacheItem;
}

type MyType = boolean | number | ILRUCache;

export function foo() {
  process.stdout.write("bar\n");
}

// random comment.
export interface ISampling extends ICacheItem {
  xstring: string;
  "xstring2": string;
  xany: any;
  xnumber: number;
  xnumber2?: number;
  xnull: null;
  /* more random comments */
  xMyType: MyType;
  xarray: string[];
  xarray2: MyType[];
  xtuple: [string, number];
  xunion: number | null;
  xparen: (number|string);    // parenthesized type
  xiface: { foo: string; bar: number };
  xliteral: "foo" | "ba\"r" | 3;
  xfunc: (price: number, quantity: number) => number;
  xfunc2(price: number, quantity?: number): number;

  // Ensure that omitted type parameters are seen as "any", without causing errors.
  ximplicit;
  ximplicitFunc: (price) => number;
  ximplicitFunc2(price);
}

// We don't support enums yet, but should ignore them without failing.
export enum SomeEnum { Foo, Bar }
