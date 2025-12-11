#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/async-lock/lib/index.js
var require_lib = __commonJS((exports, module) => {
  var AsyncLock = function(opts) {
    opts = opts || {};
    this.Promise = opts.Promise || Promise;
    this.queues = Object.create(null);
    this.domainReentrant = opts.domainReentrant || false;
    if (this.domainReentrant) {
      if (typeof process === "undefined" || typeof process.domain === "undefined") {
        throw new Error("Domain-reentrant locks require `process.domain` to exist. Please flip `opts.domainReentrant = false`, " + "use a NodeJS version that still implements Domain, or install a browser polyfill.");
      }
      this.domains = Object.create(null);
    }
    this.timeout = opts.timeout || AsyncLock.DEFAULT_TIMEOUT;
    this.maxOccupationTime = opts.maxOccupationTime || AsyncLock.DEFAULT_MAX_OCCUPATION_TIME;
    this.maxExecutionTime = opts.maxExecutionTime || AsyncLock.DEFAULT_MAX_EXECUTION_TIME;
    if (opts.maxPending === Infinity || Number.isInteger(opts.maxPending) && opts.maxPending >= 0) {
      this.maxPending = opts.maxPending;
    } else {
      this.maxPending = AsyncLock.DEFAULT_MAX_PENDING;
    }
  };
  AsyncLock.DEFAULT_TIMEOUT = 0;
  AsyncLock.DEFAULT_MAX_OCCUPATION_TIME = 0;
  AsyncLock.DEFAULT_MAX_EXECUTION_TIME = 0;
  AsyncLock.DEFAULT_MAX_PENDING = 1000;
  AsyncLock.prototype.acquire = function(key, fn, cb, opts) {
    if (Array.isArray(key)) {
      return this._acquireBatch(key, fn, cb, opts);
    }
    if (typeof fn !== "function") {
      throw new Error("You must pass a function to execute");
    }
    var deferredResolve = null;
    var deferredReject = null;
    var deferred = null;
    if (typeof cb !== "function") {
      opts = cb;
      cb = null;
      deferred = new this.Promise(function(resolve, reject) {
        deferredResolve = resolve;
        deferredReject = reject;
      });
    }
    opts = opts || {};
    var resolved = false;
    var timer = null;
    var occupationTimer = null;
    var executionTimer = null;
    var self = this;
    var done = function(locked, err, ret) {
      if (occupationTimer) {
        clearTimeout(occupationTimer);
        occupationTimer = null;
      }
      if (executionTimer) {
        clearTimeout(executionTimer);
        executionTimer = null;
      }
      if (locked) {
        if (!!self.queues[key] && self.queues[key].length === 0) {
          delete self.queues[key];
        }
        if (self.domainReentrant) {
          delete self.domains[key];
        }
      }
      if (!resolved) {
        if (!deferred) {
          if (typeof cb === "function") {
            cb(err, ret);
          }
        } else {
          if (err) {
            deferredReject(err);
          } else {
            deferredResolve(ret);
          }
        }
        resolved = true;
      }
      if (locked) {
        if (!!self.queues[key] && self.queues[key].length > 0) {
          self.queues[key].shift()();
        }
      }
    };
    var exec = function(locked) {
      if (resolved) {
        return done(locked);
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (self.domainReentrant && locked) {
        self.domains[key] = process.domain;
      }
      var maxExecutionTime = opts.maxExecutionTime || self.maxExecutionTime;
      if (maxExecutionTime) {
        executionTimer = setTimeout(function() {
          if (!!self.queues[key]) {
            done(locked, new Error("Maximum execution time is exceeded " + key));
          }
        }, maxExecutionTime);
      }
      if (fn.length === 1) {
        var called = false;
        try {
          fn(function(err, ret) {
            if (!called) {
              called = true;
              done(locked, err, ret);
            }
          });
        } catch (err) {
          if (!called) {
            called = true;
            done(locked, err);
          }
        }
      } else {
        self._promiseTry(function() {
          return fn();
        }).then(function(ret) {
          done(locked, undefined, ret);
        }, function(error) {
          done(locked, error);
        });
      }
    };
    if (self.domainReentrant && !!process.domain) {
      exec = process.domain.bind(exec);
    }
    var maxPending = opts.maxPending || self.maxPending;
    if (!self.queues[key]) {
      self.queues[key] = [];
      exec(true);
    } else if (self.domainReentrant && !!process.domain && process.domain === self.domains[key]) {
      exec(false);
    } else if (self.queues[key].length >= maxPending) {
      done(false, new Error("Too many pending tasks in queue " + key));
    } else {
      var taskFn = function() {
        exec(true);
      };
      if (opts.skipQueue) {
        self.queues[key].unshift(taskFn);
      } else {
        self.queues[key].push(taskFn);
      }
      var timeout = opts.timeout || self.timeout;
      if (timeout) {
        timer = setTimeout(function() {
          timer = null;
          done(false, new Error("async-lock timed out in queue " + key));
        }, timeout);
      }
    }
    var maxOccupationTime = opts.maxOccupationTime || self.maxOccupationTime;
    if (maxOccupationTime) {
      occupationTimer = setTimeout(function() {
        if (!!self.queues[key]) {
          done(false, new Error("Maximum occupation time is exceeded in queue " + key));
        }
      }, maxOccupationTime);
    }
    if (deferred) {
      return deferred;
    }
  };
  AsyncLock.prototype._acquireBatch = function(keys, fn, cb, opts) {
    if (typeof cb !== "function") {
      opts = cb;
      cb = null;
    }
    var self = this;
    var getFn = function(key, fn2) {
      return function(cb2) {
        self.acquire(key, fn2, cb2, opts);
      };
    };
    var fnx = keys.reduceRight(function(prev, key) {
      return getFn(key, prev);
    }, fn);
    if (typeof cb === "function") {
      fnx(cb);
    } else {
      return new this.Promise(function(resolve, reject) {
        if (fnx.length === 1) {
          fnx(function(err, ret) {
            if (err) {
              reject(err);
            } else {
              resolve(ret);
            }
          });
        } else {
          resolve(fnx());
        }
      });
    }
  };
  AsyncLock.prototype.isBusy = function(key) {
    if (!key) {
      return Object.keys(this.queues).length > 0;
    } else {
      return !!this.queues[key];
    }
  };
  AsyncLock.prototype._promiseTry = function(fn) {
    try {
      return this.Promise.resolve(fn());
    } catch (e) {
      return this.Promise.reject(e);
    }
  };
  module.exports = AsyncLock;
});

// node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS((exports, module) => {
  if (typeof Object.create === "function") {
    module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor;
        ctor.prototype.constructor = ctor;
      }
    };
  }
});

// node_modules/inherits/inherits.js
var require_inherits = __commonJS((exports, module) => {
  try {
    util = __require("util");
    if (typeof util.inherits !== "function")
      throw "";
    module.exports = util.inherits;
  } catch (e) {
    module.exports = require_inherits_browser();
  }
  var util;
});

// node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS((exports, module) => {
  /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
  var buffer = __require("buffer");
  var Buffer2 = buffer.Buffer;
  function copyProps(src, dst) {
    for (var key in src) {
      dst[key] = src[key];
    }
  }
  if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
    module.exports = buffer;
  } else {
    copyProps(buffer, exports);
    exports.Buffer = SafeBuffer;
  }
  function SafeBuffer(arg, encodingOrOffset, length) {
    return Buffer2(arg, encodingOrOffset, length);
  }
  SafeBuffer.prototype = Object.create(Buffer2.prototype);
  copyProps(Buffer2, SafeBuffer);
  SafeBuffer.from = function(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
      throw new TypeError("Argument must not be a number");
    }
    return Buffer2(arg, encodingOrOffset, length);
  };
  SafeBuffer.alloc = function(size, fill, encoding) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    var buf = Buffer2(size);
    if (fill !== undefined) {
      if (typeof encoding === "string") {
        buf.fill(fill, encoding);
      } else {
        buf.fill(fill);
      }
    } else {
      buf.fill(0);
    }
    return buf;
  };
  SafeBuffer.allocUnsafe = function(size) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    return Buffer2(size);
  };
  SafeBuffer.allocUnsafeSlow = function(size) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    return buffer.SlowBuffer(size);
  };
});

// node_modules/isarray/index.js
var require_isarray = __commonJS((exports, module) => {
  var toString = {}.toString;
  module.exports = Array.isArray || function(arr) {
    return toString.call(arr) == "[object Array]";
  };
});

// node_modules/es-errors/type.js
var require_type = __commonJS((exports, module) => {
  module.exports = TypeError;
});

// node_modules/es-object-atoms/index.js
var require_es_object_atoms = __commonJS((exports, module) => {
  module.exports = Object;
});

// node_modules/es-errors/index.js
var require_es_errors = __commonJS((exports, module) => {
  module.exports = Error;
});

// node_modules/es-errors/eval.js
var require_eval = __commonJS((exports, module) => {
  module.exports = EvalError;
});

// node_modules/es-errors/range.js
var require_range = __commonJS((exports, module) => {
  module.exports = RangeError;
});

// node_modules/es-errors/ref.js
var require_ref = __commonJS((exports, module) => {
  module.exports = ReferenceError;
});

// node_modules/es-errors/syntax.js
var require_syntax = __commonJS((exports, module) => {
  module.exports = SyntaxError;
});

// node_modules/es-errors/uri.js
var require_uri = __commonJS((exports, module) => {
  module.exports = URIError;
});

// node_modules/math-intrinsics/abs.js
var require_abs = __commonJS((exports, module) => {
  module.exports = Math.abs;
});

// node_modules/math-intrinsics/floor.js
var require_floor = __commonJS((exports, module) => {
  module.exports = Math.floor;
});

// node_modules/math-intrinsics/max.js
var require_max = __commonJS((exports, module) => {
  module.exports = Math.max;
});

// node_modules/math-intrinsics/min.js
var require_min = __commonJS((exports, module) => {
  module.exports = Math.min;
});

// node_modules/math-intrinsics/pow.js
var require_pow = __commonJS((exports, module) => {
  module.exports = Math.pow;
});

// node_modules/math-intrinsics/round.js
var require_round = __commonJS((exports, module) => {
  module.exports = Math.round;
});

// node_modules/math-intrinsics/isNaN.js
var require_isNaN = __commonJS((exports, module) => {
  module.exports = Number.isNaN || function isNaN(a) {
    return a !== a;
  };
});

// node_modules/math-intrinsics/sign.js
var require_sign = __commonJS((exports, module) => {
  var $isNaN = require_isNaN();
  module.exports = function sign(number) {
    if ($isNaN(number) || number === 0) {
      return number;
    }
    return number < 0 ? -1 : 1;
  };
});

// node_modules/gopd/gOPD.js
var require_gOPD = __commonJS((exports, module) => {
  module.exports = Object.getOwnPropertyDescriptor;
});

// node_modules/gopd/index.js
var require_gopd = __commonJS((exports, module) => {
  var $gOPD = require_gOPD();
  if ($gOPD) {
    try {
      $gOPD([], "length");
    } catch (e) {
      $gOPD = null;
    }
  }
  module.exports = $gOPD;
});

// node_modules/es-define-property/index.js
var require_es_define_property = __commonJS((exports, module) => {
  var $defineProperty = Object.defineProperty || false;
  if ($defineProperty) {
    try {
      $defineProperty({}, "a", { value: 1 });
    } catch (e) {
      $defineProperty = false;
    }
  }
  module.exports = $defineProperty;
});

// node_modules/has-symbols/shams.js
var require_shams = __commonJS((exports, module) => {
  module.exports = function hasSymbols() {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
      return false;
    }
    if (typeof Symbol.iterator === "symbol") {
      return true;
    }
    var obj = {};
    var sym = Symbol("test");
    var symObj = Object(sym);
    if (typeof sym === "string") {
      return false;
    }
    if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
      return false;
    }
    if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
      return false;
    }
    var symVal = 42;
    obj[sym] = symVal;
    for (var _ in obj) {
      return false;
    }
    if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
      return false;
    }
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
      return false;
    }
    var syms = Object.getOwnPropertySymbols(obj);
    if (syms.length !== 1 || syms[0] !== sym) {
      return false;
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
      return false;
    }
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
      if (descriptor.value !== symVal || descriptor.enumerable !== true) {
        return false;
      }
    }
    return true;
  };
});

// node_modules/has-symbols/index.js
var require_has_symbols = __commonJS((exports, module) => {
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = require_shams();
  module.exports = function hasNativeSymbols() {
    if (typeof origSymbol !== "function") {
      return false;
    }
    if (typeof Symbol !== "function") {
      return false;
    }
    if (typeof origSymbol("foo") !== "symbol") {
      return false;
    }
    if (typeof Symbol("bar") !== "symbol") {
      return false;
    }
    return hasSymbolSham();
  };
});

// node_modules/get-proto/Reflect.getPrototypeOf.js
var require_Reflect_getPrototypeOf = __commonJS((exports, module) => {
  module.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
});

// node_modules/get-proto/Object.getPrototypeOf.js
var require_Object_getPrototypeOf = __commonJS((exports, module) => {
  var $Object = require_es_object_atoms();
  module.exports = $Object.getPrototypeOf || null;
});

// node_modules/function-bind/implementation.js
var require_implementation = __commonJS((exports, module) => {
  var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
  var toStr = Object.prototype.toString;
  var max = Math.max;
  var funcType = "[object Function]";
  var concatty = function concatty(a, b) {
    var arr = [];
    for (var i = 0;i < a.length; i += 1) {
      arr[i] = a[i];
    }
    for (var j = 0;j < b.length; j += 1) {
      arr[j + a.length] = b[j];
    }
    return arr;
  };
  var slicy = function slicy(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0;i < arrLike.length; i += 1, j += 1) {
      arr[j] = arrLike[i];
    }
    return arr;
  };
  var joiny = function(arr, joiner) {
    var str = "";
    for (var i = 0;i < arr.length; i += 1) {
      str += arr[i];
      if (i + 1 < arr.length) {
        str += joiner;
      }
    }
    return str;
  };
  module.exports = function bind(that) {
    var target = this;
    if (typeof target !== "function" || toStr.apply(target) !== funcType) {
      throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);
    var bound;
    var binder = function() {
      if (this instanceof bound) {
        var result = target.apply(this, concatty(args, arguments));
        if (Object(result) === result) {
          return result;
        }
        return this;
      }
      return target.apply(that, concatty(args, arguments));
    };
    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0;i < boundLength; i++) {
      boundArgs[i] = "$" + i;
    }
    bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
    if (target.prototype) {
      var Empty = function Empty() {};
      Empty.prototype = target.prototype;
      bound.prototype = new Empty;
      Empty.prototype = null;
    }
    return bound;
  };
});

// node_modules/function-bind/index.js
var require_function_bind = __commonJS((exports, module) => {
  var implementation = require_implementation();
  module.exports = Function.prototype.bind || implementation;
});

// node_modules/call-bind-apply-helpers/functionCall.js
var require_functionCall = __commonJS((exports, module) => {
  module.exports = Function.prototype.call;
});

// node_modules/call-bind-apply-helpers/functionApply.js
var require_functionApply = __commonJS((exports, module) => {
  module.exports = Function.prototype.apply;
});

// node_modules/call-bind-apply-helpers/reflectApply.js
var require_reflectApply = __commonJS((exports, module) => {
  module.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
});

// node_modules/call-bind-apply-helpers/actualApply.js
var require_actualApply = __commonJS((exports, module) => {
  var bind = require_function_bind();
  var $apply = require_functionApply();
  var $call = require_functionCall();
  var $reflectApply = require_reflectApply();
  module.exports = $reflectApply || bind.call($call, $apply);
});

// node_modules/call-bind-apply-helpers/index.js
var require_call_bind_apply_helpers = __commonJS((exports, module) => {
  var bind = require_function_bind();
  var $TypeError = require_type();
  var $call = require_functionCall();
  var $actualApply = require_actualApply();
  module.exports = function callBindBasic(args) {
    if (args.length < 1 || typeof args[0] !== "function") {
      throw new $TypeError("a function is required");
    }
    return $actualApply(bind, $call, args);
  };
});

// node_modules/dunder-proto/get.js
var require_get = __commonJS((exports, module) => {
  var callBind = require_call_bind_apply_helpers();
  var gOPD = require_gopd();
  var hasProtoAccessor;
  try {
    hasProtoAccessor = [].__proto__ === Array.prototype;
  } catch (e) {
    if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
      throw e;
    }
  }
  var desc = !!hasProtoAccessor && gOPD && gOPD(Object.prototype, "__proto__");
  var $Object = Object;
  var $getPrototypeOf = $Object.getPrototypeOf;
  module.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? function getDunder(value) {
    return $getPrototypeOf(value == null ? value : $Object(value));
  } : false;
});

// node_modules/get-proto/index.js
var require_get_proto = __commonJS((exports, module) => {
  var reflectGetProto = require_Reflect_getPrototypeOf();
  var originalGetProto = require_Object_getPrototypeOf();
  var getDunderProto = require_get();
  module.exports = reflectGetProto ? function getProto(O) {
    return reflectGetProto(O);
  } : originalGetProto ? function getProto(O) {
    if (!O || typeof O !== "object" && typeof O !== "function") {
      throw new TypeError("getProto: not an object");
    }
    return originalGetProto(O);
  } : getDunderProto ? function getProto(O) {
    return getDunderProto(O);
  } : null;
});

// node_modules/hasown/index.js
var require_hasown = __commonJS((exports, module) => {
  var call = Function.prototype.call;
  var $hasOwn = Object.prototype.hasOwnProperty;
  var bind = require_function_bind();
  module.exports = bind.call(call, $hasOwn);
});

// node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS((exports, module) => {
  var undefined2;
  var $Object = require_es_object_atoms();
  var $Error = require_es_errors();
  var $EvalError = require_eval();
  var $RangeError = require_range();
  var $ReferenceError = require_ref();
  var $SyntaxError = require_syntax();
  var $TypeError = require_type();
  var $URIError = require_uri();
  var abs = require_abs();
  var floor = require_floor();
  var max = require_max();
  var min = require_min();
  var pow = require_pow();
  var round = require_round();
  var sign = require_sign();
  var $Function = Function;
  var getEvalledConstructor = function(expressionSyntax) {
    try {
      return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
    } catch (e) {}
  };
  var $gOPD = require_gopd();
  var $defineProperty = require_es_define_property();
  var throwTypeError = function() {
    throw new $TypeError;
  };
  var ThrowTypeError = $gOPD ? function() {
    try {
      arguments.callee;
      return throwTypeError;
    } catch (calleeThrows) {
      try {
        return $gOPD(arguments, "callee").get;
      } catch (gOPDthrows) {
        return throwTypeError;
      }
    }
  }() : throwTypeError;
  var hasSymbols = require_has_symbols()();
  var getProto = require_get_proto();
  var $ObjectGPO = require_Object_getPrototypeOf();
  var $ReflectGPO = require_Reflect_getPrototypeOf();
  var $apply = require_functionApply();
  var $call = require_functionCall();
  var needsEval = {};
  var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
  var INTRINSICS = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
    "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
    "%AsyncFromSyncIteratorPrototype%": undefined2,
    "%AsyncFunction%": needsEval,
    "%AsyncGenerator%": needsEval,
    "%AsyncGeneratorFunction%": needsEval,
    "%AsyncIteratorPrototype%": needsEval,
    "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
    "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
    "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": $Error,
    "%eval%": eval,
    "%EvalError%": $EvalError,
    "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
    "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
    "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
    "%Function%": $Function,
    "%GeneratorFunction%": needsEval,
    "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
    "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
    "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
    "%JSON%": typeof JSON === "object" ? JSON : undefined2,
    "%Map%": typeof Map === "undefined" ? undefined2 : Map,
    "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto(new Map()[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": $Object,
    "%Object.getOwnPropertyDescriptor%": $gOPD,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
    "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
    "%RangeError%": $RangeError,
    "%ReferenceError%": $ReferenceError,
    "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set === "undefined" ? undefined2 : Set,
    "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto(new Set()[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
    "%Symbol%": hasSymbols ? Symbol : undefined2,
    "%SyntaxError%": $SyntaxError,
    "%ThrowTypeError%": ThrowTypeError,
    "%TypedArray%": TypedArray,
    "%TypeError%": $TypeError,
    "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
    "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
    "%URIError%": $URIError,
    "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
    "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
    "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
    "%Function.prototype.call%": $call,
    "%Function.prototype.apply%": $apply,
    "%Object.defineProperty%": $defineProperty,
    "%Object.getPrototypeOf%": $ObjectGPO,
    "%Math.abs%": abs,
    "%Math.floor%": floor,
    "%Math.max%": max,
    "%Math.min%": min,
    "%Math.pow%": pow,
    "%Math.round%": round,
    "%Math.sign%": sign,
    "%Reflect.getPrototypeOf%": $ReflectGPO
  };
  if (getProto) {
    try {
      null.error;
    } catch (e) {
      errorProto = getProto(getProto(e));
      INTRINSICS["%Error.prototype%"] = errorProto;
    }
  }
  var errorProto;
  var doEval = function doEval(name) {
    var value;
    if (name === "%AsyncFunction%") {
      value = getEvalledConstructor("async function () {}");
    } else if (name === "%GeneratorFunction%") {
      value = getEvalledConstructor("function* () {}");
    } else if (name === "%AsyncGeneratorFunction%") {
      value = getEvalledConstructor("async function* () {}");
    } else if (name === "%AsyncGenerator%") {
      var fn = doEval("%AsyncGeneratorFunction%");
      if (fn) {
        value = fn.prototype;
      }
    } else if (name === "%AsyncIteratorPrototype%") {
      var gen = doEval("%AsyncGenerator%");
      if (gen && getProto) {
        value = getProto(gen.prototype);
      }
    }
    INTRINSICS[name] = value;
    return value;
  };
  var LEGACY_ALIASES = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  };
  var bind = require_function_bind();
  var hasOwn = require_hasown();
  var $concat = bind.call($call, Array.prototype.concat);
  var $spliceApply = bind.call($apply, Array.prototype.splice);
  var $replace = bind.call($call, String.prototype.replace);
  var $strSlice = bind.call($call, String.prototype.slice);
  var $exec = bind.call($call, RegExp.prototype.exec);
  var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = function stringToPath(string) {
    var first = $strSlice(string, 0, 1);
    var last = $strSlice(string, -1);
    if (first === "%" && last !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
    } else if (last === "%" && first !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
    }
    var result = [];
    $replace(string, rePropName, function(match, number, quote, subString) {
      result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
    });
    return result;
  };
  var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
    var intrinsicName = name;
    var alias;
    if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
      alias = LEGACY_ALIASES[intrinsicName];
      intrinsicName = "%" + alias[0] + "%";
    }
    if (hasOwn(INTRINSICS, intrinsicName)) {
      var value = INTRINSICS[intrinsicName];
      if (value === needsEval) {
        value = doEval(intrinsicName);
      }
      if (typeof value === "undefined" && !allowMissing) {
        throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      }
      return {
        alias,
        name: intrinsicName,
        value
      };
    }
    throw new $SyntaxError("intrinsic " + name + " does not exist!");
  };
  module.exports = function GetIntrinsic(name, allowMissing) {
    if (typeof name !== "string" || name.length === 0) {
      throw new $TypeError("intrinsic name must be a non-empty string");
    }
    if (arguments.length > 1 && typeof allowMissing !== "boolean") {
      throw new $TypeError('"allowMissing" argument must be a boolean');
    }
    if ($exec(/^%?[^%]*%?$/, name) === null) {
      throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    }
    var parts = stringToPath(name);
    var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
    var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
    var intrinsicRealName = intrinsic.name;
    var value = intrinsic.value;
    var skipFurtherCaching = false;
    var alias = intrinsic.alias;
    if (alias) {
      intrinsicBaseName = alias[0];
      $spliceApply(parts, $concat([0, 1], alias));
    }
    for (var i = 1, isOwn = true;i < parts.length; i += 1) {
      var part = parts[i];
      var first = $strSlice(part, 0, 1);
      var last = $strSlice(part, -1);
      if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
        throw new $SyntaxError("property names with quotes must have matching quotes");
      }
      if (part === "constructor" || !isOwn) {
        skipFurtherCaching = true;
      }
      intrinsicBaseName += "." + part;
      intrinsicRealName = "%" + intrinsicBaseName + "%";
      if (hasOwn(INTRINSICS, intrinsicRealName)) {
        value = INTRINSICS[intrinsicRealName];
      } else if (value != null) {
        if (!(part in value)) {
          if (!allowMissing) {
            throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
          }
          return;
        }
        if ($gOPD && i + 1 >= parts.length) {
          var desc = $gOPD(value, part);
          isOwn = !!desc;
          if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
            value = desc.get;
          } else {
            value = value[part];
          }
        } else {
          isOwn = hasOwn(value, part);
          value = value[part];
        }
        if (isOwn && !skipFurtherCaching) {
          INTRINSICS[intrinsicRealName] = value;
        }
      }
    }
    return value;
  };
});

// node_modules/call-bound/index.js
var require_call_bound = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var callBindBasic = require_call_bind_apply_helpers();
  var $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
  module.exports = function callBoundIntrinsic(name, allowMissing) {
    var intrinsic = GetIntrinsic(name, !!allowMissing);
    if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
      return callBindBasic([intrinsic]);
    }
    return intrinsic;
  };
});

// node_modules/is-callable/index.js
var require_is_callable = __commonJS((exports, module) => {
  var fnToStr = Function.prototype.toString;
  var reflectApply = typeof Reflect === "object" && Reflect !== null && Reflect.apply;
  var badArrayLike;
  var isCallableMarker;
  if (typeof reflectApply === "function" && typeof Object.defineProperty === "function") {
    try {
      badArrayLike = Object.defineProperty({}, "length", {
        get: function() {
          throw isCallableMarker;
        }
      });
      isCallableMarker = {};
      reflectApply(function() {
        throw 42;
      }, null, badArrayLike);
    } catch (_) {
      if (_ !== isCallableMarker) {
        reflectApply = null;
      }
    }
  } else {
    reflectApply = null;
  }
  var constructorRegex = /^\s*class\b/;
  var isES6ClassFn = function isES6ClassFunction(value) {
    try {
      var fnStr = fnToStr.call(value);
      return constructorRegex.test(fnStr);
    } catch (e) {
      return false;
    }
  };
  var tryFunctionObject = function tryFunctionToStr(value) {
    try {
      if (isES6ClassFn(value)) {
        return false;
      }
      fnToStr.call(value);
      return true;
    } catch (e) {
      return false;
    }
  };
  var toStr = Object.prototype.toString;
  var objectClass = "[object Object]";
  var fnClass = "[object Function]";
  var genClass = "[object GeneratorFunction]";
  var ddaClass = "[object HTMLAllCollection]";
  var ddaClass2 = "[object HTML document.all class]";
  var ddaClass3 = "[object HTMLCollection]";
  var hasToStringTag = typeof Symbol === "function" && !!Symbol.toStringTag;
  var isIE68 = !(0 in [,]);
  var isDDA = function isDocumentDotAll() {
    return false;
  };
  if (typeof document === "object") {
    all = document.all;
    if (toStr.call(all) === toStr.call(document.all)) {
      isDDA = function isDocumentDotAll(value) {
        if ((isIE68 || !value) && (typeof value === "undefined" || typeof value === "object")) {
          try {
            var str = toStr.call(value);
            return (str === ddaClass || str === ddaClass2 || str === ddaClass3 || str === objectClass) && value("") == null;
          } catch (e) {}
        }
        return false;
      };
    }
  }
  var all;
  module.exports = reflectApply ? function isCallable(value) {
    if (isDDA(value)) {
      return true;
    }
    if (!value) {
      return false;
    }
    if (typeof value !== "function" && typeof value !== "object") {
      return false;
    }
    try {
      reflectApply(value, null, badArrayLike);
    } catch (e) {
      if (e !== isCallableMarker) {
        return false;
      }
    }
    return !isES6ClassFn(value) && tryFunctionObject(value);
  } : function isCallable(value) {
    if (isDDA(value)) {
      return true;
    }
    if (!value) {
      return false;
    }
    if (typeof value !== "function" && typeof value !== "object") {
      return false;
    }
    if (hasToStringTag) {
      return tryFunctionObject(value);
    }
    if (isES6ClassFn(value)) {
      return false;
    }
    var strClass = toStr.call(value);
    if (strClass !== fnClass && strClass !== genClass && !/^\[object HTML/.test(strClass)) {
      return false;
    }
    return tryFunctionObject(value);
  };
});

// node_modules/for-each/index.js
var require_for_each = __commonJS((exports, module) => {
  var isCallable = require_is_callable();
  var toStr = Object.prototype.toString;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length;i < len; i++) {
      if (hasOwnProperty.call(array, i)) {
        if (receiver == null) {
          iterator(array[i], i, array);
        } else {
          iterator.call(receiver, array[i], i, array);
        }
      }
    }
  };
  var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length;i < len; i++) {
      if (receiver == null) {
        iterator(string.charAt(i), i, string);
      } else {
        iterator.call(receiver, string.charAt(i), i, string);
      }
    }
  };
  var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
      if (hasOwnProperty.call(object, k)) {
        if (receiver == null) {
          iterator(object[k], k, object);
        } else {
          iterator.call(receiver, object[k], k, object);
        }
      }
    }
  };
  function isArray(x) {
    return toStr.call(x) === "[object Array]";
  }
  module.exports = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
      throw new TypeError("iterator must be a function");
    }
    var receiver;
    if (arguments.length >= 3) {
      receiver = thisArg;
    }
    if (isArray(list)) {
      forEachArray(list, iterator, receiver);
    } else if (typeof list === "string") {
      forEachString(list, iterator, receiver);
    } else {
      forEachObject(list, iterator, receiver);
    }
  };
});

// node_modules/possible-typed-array-names/index.js
var require_possible_typed_array_names = __commonJS((exports, module) => {
  module.exports = [
    "Float16Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array"
  ];
});

// node_modules/available-typed-arrays/index.js
var require_available_typed_arrays = __commonJS((exports, module) => {
  var possibleNames = require_possible_typed_array_names();
  var g = typeof globalThis === "undefined" ? global : globalThis;
  module.exports = function availableTypedArrays() {
    var out = [];
    for (var i = 0;i < possibleNames.length; i++) {
      if (typeof g[possibleNames[i]] === "function") {
        out[out.length] = possibleNames[i];
      }
    }
    return out;
  };
});

// node_modules/define-data-property/index.js
var require_define_data_property = __commonJS((exports, module) => {
  var $defineProperty = require_es_define_property();
  var $SyntaxError = require_syntax();
  var $TypeError = require_type();
  var gopd = require_gopd();
  module.exports = function defineDataProperty(obj, property, value) {
    if (!obj || typeof obj !== "object" && typeof obj !== "function") {
      throw new $TypeError("`obj` must be an object or a function`");
    }
    if (typeof property !== "string" && typeof property !== "symbol") {
      throw new $TypeError("`property` must be a string or a symbol`");
    }
    if (arguments.length > 3 && typeof arguments[3] !== "boolean" && arguments[3] !== null) {
      throw new $TypeError("`nonEnumerable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 4 && typeof arguments[4] !== "boolean" && arguments[4] !== null) {
      throw new $TypeError("`nonWritable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 5 && typeof arguments[5] !== "boolean" && arguments[5] !== null) {
      throw new $TypeError("`nonConfigurable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 6 && typeof arguments[6] !== "boolean") {
      throw new $TypeError("`loose`, if provided, must be a boolean");
    }
    var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
    var nonWritable = arguments.length > 4 ? arguments[4] : null;
    var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
    var loose = arguments.length > 6 ? arguments[6] : false;
    var desc = !!gopd && gopd(obj, property);
    if ($defineProperty) {
      $defineProperty(obj, property, {
        configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
        enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
        value,
        writable: nonWritable === null && desc ? desc.writable : !nonWritable
      });
    } else if (loose || !nonEnumerable && !nonWritable && !nonConfigurable) {
      obj[property] = value;
    } else {
      throw new $SyntaxError("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
    }
  };
});

// node_modules/has-property-descriptors/index.js
var require_has_property_descriptors = __commonJS((exports, module) => {
  var $defineProperty = require_es_define_property();
  var hasPropertyDescriptors = function hasPropertyDescriptors() {
    return !!$defineProperty;
  };
  hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
    if (!$defineProperty) {
      return null;
    }
    try {
      return $defineProperty([], "length", { value: 1 }).length !== 1;
    } catch (e) {
      return true;
    }
  };
  module.exports = hasPropertyDescriptors;
});

// node_modules/set-function-length/index.js
var require_set_function_length = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var define2 = require_define_data_property();
  var hasDescriptors = require_has_property_descriptors()();
  var gOPD = require_gopd();
  var $TypeError = require_type();
  var $floor = GetIntrinsic("%Math.floor%");
  module.exports = function setFunctionLength(fn, length) {
    if (typeof fn !== "function") {
      throw new $TypeError("`fn` is not a function");
    }
    if (typeof length !== "number" || length < 0 || length > 4294967295 || $floor(length) !== length) {
      throw new $TypeError("`length` must be a positive 32-bit integer");
    }
    var loose = arguments.length > 2 && !!arguments[2];
    var functionLengthIsConfigurable = true;
    var functionLengthIsWritable = true;
    if ("length" in fn && gOPD) {
      var desc = gOPD(fn, "length");
      if (desc && !desc.configurable) {
        functionLengthIsConfigurable = false;
      }
      if (desc && !desc.writable) {
        functionLengthIsWritable = false;
      }
    }
    if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
      if (hasDescriptors) {
        define2(fn, "length", length, true, true);
      } else {
        define2(fn, "length", length);
      }
    }
    return fn;
  };
});

// node_modules/call-bind-apply-helpers/applyBind.js
var require_applyBind = __commonJS((exports, module) => {
  var bind = require_function_bind();
  var $apply = require_functionApply();
  var actualApply = require_actualApply();
  module.exports = function applyBind() {
    return actualApply(bind, $apply, arguments);
  };
});

// node_modules/call-bind/index.js
var require_call_bind = __commonJS((exports, module) => {
  var setFunctionLength = require_set_function_length();
  var $defineProperty = require_es_define_property();
  var callBindBasic = require_call_bind_apply_helpers();
  var applyBind = require_applyBind();
  module.exports = function callBind(originalFunction) {
    var func = callBindBasic(arguments);
    var adjustedLength = originalFunction.length - (arguments.length - 1);
    return setFunctionLength(func, 1 + (adjustedLength > 0 ? adjustedLength : 0), true);
  };
  if ($defineProperty) {
    $defineProperty(module.exports, "apply", { value: applyBind });
  } else {
    module.exports.apply = applyBind;
  }
});

// node_modules/has-tostringtag/shams.js
var require_shams2 = __commonJS((exports, module) => {
  var hasSymbols = require_shams();
  module.exports = function hasToStringTagShams() {
    return hasSymbols() && !!Symbol.toStringTag;
  };
});

// node_modules/which-typed-array/index.js
var require_which_typed_array = __commonJS((exports, module) => {
  var forEach = require_for_each();
  var availableTypedArrays = require_available_typed_arrays();
  var callBind = require_call_bind();
  var callBound = require_call_bound();
  var gOPD = require_gopd();
  var getProto = require_get_proto();
  var $toString = callBound("Object.prototype.toString");
  var hasToStringTag = require_shams2()();
  var g = typeof globalThis === "undefined" ? global : globalThis;
  var typedArrays = availableTypedArrays();
  var $slice = callBound("String.prototype.slice");
  var $indexOf = callBound("Array.prototype.indexOf", true) || function indexOf(array, value) {
    for (var i = 0;i < array.length; i += 1) {
      if (array[i] === value) {
        return i;
      }
    }
    return -1;
  };
  var cache = { __proto__: null };
  if (hasToStringTag && gOPD && getProto) {
    forEach(typedArrays, function(typedArray) {
      var arr = new g[typedArray];
      if (Symbol.toStringTag in arr && getProto) {
        var proto = getProto(arr);
        var descriptor = gOPD(proto, Symbol.toStringTag);
        if (!descriptor && proto) {
          var superProto = getProto(proto);
          descriptor = gOPD(superProto, Symbol.toStringTag);
        }
        cache["$" + typedArray] = callBind(descriptor.get);
      }
    });
  } else {
    forEach(typedArrays, function(typedArray) {
      var arr = new g[typedArray];
      var fn = arr.slice || arr.set;
      if (fn) {
        cache["$" + typedArray] = callBind(fn);
      }
    });
  }
  var tryTypedArrays = function tryAllTypedArrays(value) {
    var found = false;
    forEach(cache, function(getter, typedArray) {
      if (!found) {
        try {
          if ("$" + getter(value) === typedArray) {
            found = $slice(typedArray, 1);
          }
        } catch (e) {}
      }
    });
    return found;
  };
  var trySlices = function tryAllSlices(value) {
    var found = false;
    forEach(cache, function(getter, name) {
      if (!found) {
        try {
          getter(value);
          found = $slice(name, 1);
        } catch (e) {}
      }
    });
    return found;
  };
  module.exports = function whichTypedArray(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    if (!hasToStringTag) {
      var tag = $slice($toString(value), 8, -1);
      if ($indexOf(typedArrays, tag) > -1) {
        return tag;
      }
      if (tag !== "Object") {
        return false;
      }
      return trySlices(value);
    }
    if (!gOPD) {
      return null;
    }
    return tryTypedArrays(value);
  };
});

// node_modules/is-typed-array/index.js
var require_is_typed_array = __commonJS((exports, module) => {
  var whichTypedArray = require_which_typed_array();
  module.exports = function isTypedArray(value) {
    return !!whichTypedArray(value);
  };
});

// node_modules/typed-array-buffer/index.js
var require_typed_array_buffer = __commonJS((exports, module) => {
  var $TypeError = require_type();
  var callBound = require_call_bound();
  var $typedArrayBuffer = callBound("TypedArray.prototype.buffer", true);
  var isTypedArray = require_is_typed_array();
  module.exports = $typedArrayBuffer || function typedArrayBuffer(x) {
    if (!isTypedArray(x)) {
      throw new $TypeError("Not a Typed Array");
    }
    return x.buffer;
  };
});

// node_modules/to-buffer/index.js
var require_to_buffer = __commonJS((exports, module) => {
  var Buffer2 = require_safe_buffer().Buffer;
  var isArray = require_isarray();
  var typedArrayBuffer = require_typed_array_buffer();
  var isView = ArrayBuffer.isView || function isView(obj) {
    try {
      typedArrayBuffer(obj);
      return true;
    } catch (e) {
      return false;
    }
  };
  var useUint8Array = typeof Uint8Array !== "undefined";
  var useArrayBuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
  var useFromArrayBuffer = useArrayBuffer && (Buffer2.prototype instanceof Uint8Array || Buffer2.TYPED_ARRAY_SUPPORT);
  module.exports = function toBuffer(data, encoding) {
    if (Buffer2.isBuffer(data)) {
      if (data.constructor && !("isBuffer" in data)) {
        return Buffer2.from(data);
      }
      return data;
    }
    if (typeof data === "string") {
      return Buffer2.from(data, encoding);
    }
    if (useArrayBuffer && isView(data)) {
      if (data.byteLength === 0) {
        return Buffer2.alloc(0);
      }
      if (useFromArrayBuffer) {
        var res = Buffer2.from(data.buffer, data.byteOffset, data.byteLength);
        if (res.byteLength === data.byteLength) {
          return res;
        }
      }
      var uint8 = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      var result = Buffer2.from(uint8);
      if (result.length === data.byteLength) {
        return result;
      }
    }
    if (useUint8Array && data instanceof Uint8Array) {
      return Buffer2.from(data);
    }
    var isArr = isArray(data);
    if (isArr) {
      for (var i = 0;i < data.length; i += 1) {
        var x = data[i];
        if (typeof x !== "number" || x < 0 || x > 255 || ~~x !== x) {
          throw new RangeError("Array items must be numbers in the range 0-255.");
        }
      }
    }
    if (isArr || Buffer2.isBuffer(data) && data.constructor && typeof data.constructor.isBuffer === "function" && data.constructor.isBuffer(data)) {
      return Buffer2.from(data);
    }
    throw new TypeError('The "data" argument must be a string, an Array, a Buffer, a Uint8Array, or a DataView.');
  };
});

// node_modules/sha.js/hash.js
var require_hash = __commonJS((exports, module) => {
  var Buffer2 = require_safe_buffer().Buffer;
  var toBuffer = require_to_buffer();
  function Hash(blockSize, finalSize) {
    this._block = Buffer2.alloc(blockSize);
    this._finalSize = finalSize;
    this._blockSize = blockSize;
    this._len = 0;
  }
  Hash.prototype.update = function(data, enc) {
    data = toBuffer(data, enc || "utf8");
    var block = this._block;
    var blockSize = this._blockSize;
    var length = data.length;
    var accum = this._len;
    for (var offset = 0;offset < length; ) {
      var assigned = accum % blockSize;
      var remainder = Math.min(length - offset, blockSize - assigned);
      for (var i = 0;i < remainder; i++) {
        block[assigned + i] = data[offset + i];
      }
      accum += remainder;
      offset += remainder;
      if (accum % blockSize === 0) {
        this._update(block);
      }
    }
    this._len += length;
    return this;
  };
  Hash.prototype.digest = function(enc) {
    var rem = this._len % this._blockSize;
    this._block[rem] = 128;
    this._block.fill(0, rem + 1);
    if (rem >= this._finalSize) {
      this._update(this._block);
      this._block.fill(0);
    }
    var bits = this._len * 8;
    if (bits <= 4294967295) {
      this._block.writeUInt32BE(bits, this._blockSize - 4);
    } else {
      var lowBits = (bits & 4294967295) >>> 0;
      var highBits = (bits - lowBits) / 4294967296;
      this._block.writeUInt32BE(highBits, this._blockSize - 8);
      this._block.writeUInt32BE(lowBits, this._blockSize - 4);
    }
    this._update(this._block);
    var hash = this._hash();
    return enc ? hash.toString(enc) : hash;
  };
  Hash.prototype._update = function() {
    throw new Error("_update must be implemented by subclass");
  };
  module.exports = Hash;
});

// node_modules/sha.js/sha1.js
var require_sha1 = __commonJS((exports, module) => {
  var inherits = require_inherits();
  var Hash = require_hash();
  var Buffer2 = require_safe_buffer().Buffer;
  var K = [
    1518500249,
    1859775393,
    2400959708 | 0,
    3395469782 | 0
  ];
  var W = new Array(80);
  function Sha1() {
    this.init();
    this._w = W;
    Hash.call(this, 64, 56);
  }
  inherits(Sha1, Hash);
  Sha1.prototype.init = function() {
    this._a = 1732584193;
    this._b = 4023233417;
    this._c = 2562383102;
    this._d = 271733878;
    this._e = 3285377520;
    return this;
  };
  function rotl1(num) {
    return num << 1 | num >>> 31;
  }
  function rotl5(num) {
    return num << 5 | num >>> 27;
  }
  function rotl30(num) {
    return num << 30 | num >>> 2;
  }
  function ft(s, b, c, d) {
    if (s === 0) {
      return b & c | ~b & d;
    }
    if (s === 2) {
      return b & c | b & d | c & d;
    }
    return b ^ c ^ d;
  }
  Sha1.prototype._update = function(M) {
    var w = this._w;
    var a = this._a | 0;
    var b = this._b | 0;
    var c = this._c | 0;
    var d = this._d | 0;
    var e = this._e | 0;
    for (var i = 0;i < 16; ++i) {
      w[i] = M.readInt32BE(i * 4);
    }
    for (;i < 80; ++i) {
      w[i] = rotl1(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]);
    }
    for (var j = 0;j < 80; ++j) {
      var s = ~~(j / 20);
      var t = rotl5(a) + ft(s, b, c, d) + e + w[j] + K[s] | 0;
      e = d;
      d = c;
      c = rotl30(b);
      b = a;
      a = t;
    }
    this._a = a + this._a | 0;
    this._b = b + this._b | 0;
    this._c = c + this._c | 0;
    this._d = d + this._d | 0;
    this._e = e + this._e | 0;
  };
  Sha1.prototype._hash = function() {
    var H = Buffer2.allocUnsafe(20);
    H.writeInt32BE(this._a | 0, 0);
    H.writeInt32BE(this._b | 0, 4);
    H.writeInt32BE(this._c | 0, 8);
    H.writeInt32BE(this._d | 0, 12);
    H.writeInt32BE(this._e | 0, 16);
    return H;
  };
  module.exports = Sha1;
});

// node_modules/crc-32/crc32.js
var require_crc32 = __commonJS((exports) => {
  /*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */
  var CRC32;
  (function(factory) {
    if (typeof DO_NOT_EXPORT_CRC === "undefined") {
      if (typeof exports === "object") {
        factory(exports);
      } else if (typeof define === "function" && define.amd) {
        define(function() {
          var module2 = {};
          factory(module2);
          return module2;
        });
      } else {
        factory(CRC32 = {});
      }
    } else {
      factory(CRC32 = {});
    }
  })(function(CRC322) {
    CRC322.version = "1.2.2";
    function signed_crc_table() {
      var c = 0, table = new Array(256);
      for (var n = 0;n != 256; ++n) {
        c = n;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
        table[n] = c;
      }
      return typeof Int32Array !== "undefined" ? new Int32Array(table) : table;
    }
    var T0 = signed_crc_table();
    function slice_by_16_tables(T) {
      var c = 0, v = 0, n = 0, table = typeof Int32Array !== "undefined" ? new Int32Array(4096) : new Array(4096);
      for (n = 0;n != 256; ++n)
        table[n] = T[n];
      for (n = 0;n != 256; ++n) {
        v = T[n];
        for (c = 256 + n;c < 4096; c += 256)
          v = table[c] = v >>> 8 ^ T[v & 255];
      }
      var out = [];
      for (n = 1;n != 16; ++n)
        out[n - 1] = typeof Int32Array !== "undefined" ? table.subarray(n * 256, n * 256 + 256) : table.slice(n * 256, n * 256 + 256);
      return out;
    }
    var TT = slice_by_16_tables(T0);
    var T1 = TT[0], T2 = TT[1], T3 = TT[2], T4 = TT[3], T5 = TT[4];
    var T6 = TT[5], T7 = TT[6], T8 = TT[7], T9 = TT[8], Ta = TT[9];
    var Tb = TT[10], Tc = TT[11], Td = TT[12], Te = TT[13], Tf = TT[14];
    function crc32_bstr(bstr, seed) {
      var C = seed ^ -1;
      for (var i = 0, L = bstr.length;i < L; )
        C = C >>> 8 ^ T0[(C ^ bstr.charCodeAt(i++)) & 255];
      return ~C;
    }
    function crc32_buf(B, seed) {
      var C = seed ^ -1, L = B.length - 15, i = 0;
      for (;i < L; )
        C = Tf[B[i++] ^ C & 255] ^ Te[B[i++] ^ C >> 8 & 255] ^ Td[B[i++] ^ C >> 16 & 255] ^ Tc[B[i++] ^ C >>> 24] ^ Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^ T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^ T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
      L += 15;
      while (i < L)
        C = C >>> 8 ^ T0[(C ^ B[i++]) & 255];
      return ~C;
    }
    function crc32_str(str, seed) {
      var C = seed ^ -1;
      for (var i = 0, L = str.length, c = 0, d = 0;i < L; ) {
        c = str.charCodeAt(i++);
        if (c < 128) {
          C = C >>> 8 ^ T0[(C ^ c) & 255];
        } else if (c < 2048) {
          C = C >>> 8 ^ T0[(C ^ (192 | c >> 6 & 31)) & 255];
          C = C >>> 8 ^ T0[(C ^ (128 | c & 63)) & 255];
        } else if (c >= 55296 && c < 57344) {
          c = (c & 1023) + 64;
          d = str.charCodeAt(i++) & 1023;
          C = C >>> 8 ^ T0[(C ^ (240 | c >> 8 & 7)) & 255];
          C = C >>> 8 ^ T0[(C ^ (128 | c >> 2 & 63)) & 255];
          C = C >>> 8 ^ T0[(C ^ (128 | d >> 6 & 15 | (c & 3) << 4)) & 255];
          C = C >>> 8 ^ T0[(C ^ (128 | d & 63)) & 255];
        } else {
          C = C >>> 8 ^ T0[(C ^ (224 | c >> 12 & 15)) & 255];
          C = C >>> 8 ^ T0[(C ^ (128 | c >> 6 & 63)) & 255];
          C = C >>> 8 ^ T0[(C ^ (128 | c & 63)) & 255];
        }
      }
      return ~C;
    }
    CRC322.table = T0;
    CRC322.bstr = crc32_bstr;
    CRC322.buf = crc32_buf;
    CRC322.str = crc32_str;
  });
});

// node_modules/pako/lib/utils/common.js
var require_common = __commonJS((exports) => {
  var TYPED_OK = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Int32Array !== "undefined";
  function _has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }
  exports.assign = function(obj) {
    var sources = Array.prototype.slice.call(arguments, 1);
    while (sources.length) {
      var source = sources.shift();
      if (!source) {
        continue;
      }
      if (typeof source !== "object") {
        throw new TypeError(source + "must be non-object");
      }
      for (var p in source) {
        if (_has(source, p)) {
          obj[p] = source[p];
        }
      }
    }
    return obj;
  };
  exports.shrinkBuf = function(buf, size) {
    if (buf.length === size) {
      return buf;
    }
    if (buf.subarray) {
      return buf.subarray(0, size);
    }
    buf.length = size;
    return buf;
  };
  var fnTyped = {
    arraySet: function(dest, src, src_offs, len, dest_offs) {
      if (src.subarray && dest.subarray) {
        dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
        return;
      }
      for (var i = 0;i < len; i++) {
        dest[dest_offs + i] = src[src_offs + i];
      }
    },
    flattenChunks: function(chunks) {
      var i, l, len, pos, chunk, result;
      len = 0;
      for (i = 0, l = chunks.length;i < l; i++) {
        len += chunks[i].length;
      }
      result = new Uint8Array(len);
      pos = 0;
      for (i = 0, l = chunks.length;i < l; i++) {
        chunk = chunks[i];
        result.set(chunk, pos);
        pos += chunk.length;
      }
      return result;
    }
  };
  var fnUntyped = {
    arraySet: function(dest, src, src_offs, len, dest_offs) {
      for (var i = 0;i < len; i++) {
        dest[dest_offs + i] = src[src_offs + i];
      }
    },
    flattenChunks: function(chunks) {
      return [].concat.apply([], chunks);
    }
  };
  exports.setTyped = function(on) {
    if (on) {
      exports.Buf8 = Uint8Array;
      exports.Buf16 = Uint16Array;
      exports.Buf32 = Int32Array;
      exports.assign(exports, fnTyped);
    } else {
      exports.Buf8 = Array;
      exports.Buf16 = Array;
      exports.Buf32 = Array;
      exports.assign(exports, fnUntyped);
    }
  };
  exports.setTyped(TYPED_OK);
});

// node_modules/pako/lib/zlib/trees.js
var require_trees = __commonJS((exports) => {
  var utils = require_common();
  var Z_FIXED = 4;
  var Z_BINARY = 0;
  var Z_TEXT = 1;
  var Z_UNKNOWN = 2;
  function zero(buf) {
    var len = buf.length;
    while (--len >= 0) {
      buf[len] = 0;
    }
  }
  var STORED_BLOCK = 0;
  var STATIC_TREES = 1;
  var DYN_TREES = 2;
  var MIN_MATCH = 3;
  var MAX_MATCH = 258;
  var LENGTH_CODES = 29;
  var LITERALS = 256;
  var L_CODES = LITERALS + 1 + LENGTH_CODES;
  var D_CODES = 30;
  var BL_CODES = 19;
  var HEAP_SIZE = 2 * L_CODES + 1;
  var MAX_BITS = 15;
  var Buf_size = 16;
  var MAX_BL_BITS = 7;
  var END_BLOCK = 256;
  var REP_3_6 = 16;
  var REPZ_3_10 = 17;
  var REPZ_11_138 = 18;
  var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
  var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var DIST_CODE_LEN = 512;
  var static_ltree = new Array((L_CODES + 2) * 2);
  zero(static_ltree);
  var static_dtree = new Array(D_CODES * 2);
  zero(static_dtree);
  var _dist_code = new Array(DIST_CODE_LEN);
  zero(_dist_code);
  var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
  zero(_length_code);
  var base_length = new Array(LENGTH_CODES);
  zero(base_length);
  var base_dist = new Array(D_CODES);
  zero(base_dist);
  function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
    this.static_tree = static_tree;
    this.extra_bits = extra_bits;
    this.extra_base = extra_base;
    this.elems = elems;
    this.max_length = max_length;
    this.has_stree = static_tree && static_tree.length;
  }
  var static_l_desc;
  var static_d_desc;
  var static_bl_desc;
  function TreeDesc(dyn_tree, stat_desc) {
    this.dyn_tree = dyn_tree;
    this.max_code = 0;
    this.stat_desc = stat_desc;
  }
  function d_code(dist) {
    return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
  }
  function put_short(s, w) {
    s.pending_buf[s.pending++] = w & 255;
    s.pending_buf[s.pending++] = w >>> 8 & 255;
  }
  function send_bits(s, value, length) {
    if (s.bi_valid > Buf_size - length) {
      s.bi_buf |= value << s.bi_valid & 65535;
      put_short(s, s.bi_buf);
      s.bi_buf = value >> Buf_size - s.bi_valid;
      s.bi_valid += length - Buf_size;
    } else {
      s.bi_buf |= value << s.bi_valid & 65535;
      s.bi_valid += length;
    }
  }
  function send_code(s, c, tree) {
    send_bits(s, tree[c * 2], tree[c * 2 + 1]);
  }
  function bi_reverse(code, len) {
    var res = 0;
    do {
      res |= code & 1;
      code >>>= 1;
      res <<= 1;
    } while (--len > 0);
    return res >>> 1;
  }
  function bi_flush(s) {
    if (s.bi_valid === 16) {
      put_short(s, s.bi_buf);
      s.bi_buf = 0;
      s.bi_valid = 0;
    } else if (s.bi_valid >= 8) {
      s.pending_buf[s.pending++] = s.bi_buf & 255;
      s.bi_buf >>= 8;
      s.bi_valid -= 8;
    }
  }
  function gen_bitlen(s, desc) {
    var tree = desc.dyn_tree;
    var max_code = desc.max_code;
    var stree = desc.stat_desc.static_tree;
    var has_stree = desc.stat_desc.has_stree;
    var extra = desc.stat_desc.extra_bits;
    var base = desc.stat_desc.extra_base;
    var max_length = desc.stat_desc.max_length;
    var h;
    var n, m;
    var bits;
    var xbits;
    var f;
    var overflow = 0;
    for (bits = 0;bits <= MAX_BITS; bits++) {
      s.bl_count[bits] = 0;
    }
    tree[s.heap[s.heap_max] * 2 + 1] = 0;
    for (h = s.heap_max + 1;h < HEAP_SIZE; h++) {
      n = s.heap[h];
      bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
      if (bits > max_length) {
        bits = max_length;
        overflow++;
      }
      tree[n * 2 + 1] = bits;
      if (n > max_code) {
        continue;
      }
      s.bl_count[bits]++;
      xbits = 0;
      if (n >= base) {
        xbits = extra[n - base];
      }
      f = tree[n * 2];
      s.opt_len += f * (bits + xbits);
      if (has_stree) {
        s.static_len += f * (stree[n * 2 + 1] + xbits);
      }
    }
    if (overflow === 0) {
      return;
    }
    do {
      bits = max_length - 1;
      while (s.bl_count[bits] === 0) {
        bits--;
      }
      s.bl_count[bits]--;
      s.bl_count[bits + 1] += 2;
      s.bl_count[max_length]--;
      overflow -= 2;
    } while (overflow > 0);
    for (bits = max_length;bits !== 0; bits--) {
      n = s.bl_count[bits];
      while (n !== 0) {
        m = s.heap[--h];
        if (m > max_code) {
          continue;
        }
        if (tree[m * 2 + 1] !== bits) {
          s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
          tree[m * 2 + 1] = bits;
        }
        n--;
      }
    }
  }
  function gen_codes(tree, max_code, bl_count) {
    var next_code = new Array(MAX_BITS + 1);
    var code = 0;
    var bits;
    var n;
    for (bits = 1;bits <= MAX_BITS; bits++) {
      next_code[bits] = code = code + bl_count[bits - 1] << 1;
    }
    for (n = 0;n <= max_code; n++) {
      var len = tree[n * 2 + 1];
      if (len === 0) {
        continue;
      }
      tree[n * 2] = bi_reverse(next_code[len]++, len);
    }
  }
  function tr_static_init() {
    var n;
    var bits;
    var length;
    var code;
    var dist;
    var bl_count = new Array(MAX_BITS + 1);
    length = 0;
    for (code = 0;code < LENGTH_CODES - 1; code++) {
      base_length[code] = length;
      for (n = 0;n < 1 << extra_lbits[code]; n++) {
        _length_code[length++] = code;
      }
    }
    _length_code[length - 1] = code;
    dist = 0;
    for (code = 0;code < 16; code++) {
      base_dist[code] = dist;
      for (n = 0;n < 1 << extra_dbits[code]; n++) {
        _dist_code[dist++] = code;
      }
    }
    dist >>= 7;
    for (;code < D_CODES; code++) {
      base_dist[code] = dist << 7;
      for (n = 0;n < 1 << extra_dbits[code] - 7; n++) {
        _dist_code[256 + dist++] = code;
      }
    }
    for (bits = 0;bits <= MAX_BITS; bits++) {
      bl_count[bits] = 0;
    }
    n = 0;
    while (n <= 143) {
      static_ltree[n * 2 + 1] = 8;
      n++;
      bl_count[8]++;
    }
    while (n <= 255) {
      static_ltree[n * 2 + 1] = 9;
      n++;
      bl_count[9]++;
    }
    while (n <= 279) {
      static_ltree[n * 2 + 1] = 7;
      n++;
      bl_count[7]++;
    }
    while (n <= 287) {
      static_ltree[n * 2 + 1] = 8;
      n++;
      bl_count[8]++;
    }
    gen_codes(static_ltree, L_CODES + 1, bl_count);
    for (n = 0;n < D_CODES; n++) {
      static_dtree[n * 2 + 1] = 5;
      static_dtree[n * 2] = bi_reverse(n, 5);
    }
    static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
    static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
    static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
  }
  function init_block(s) {
    var n;
    for (n = 0;n < L_CODES; n++) {
      s.dyn_ltree[n * 2] = 0;
    }
    for (n = 0;n < D_CODES; n++) {
      s.dyn_dtree[n * 2] = 0;
    }
    for (n = 0;n < BL_CODES; n++) {
      s.bl_tree[n * 2] = 0;
    }
    s.dyn_ltree[END_BLOCK * 2] = 1;
    s.opt_len = s.static_len = 0;
    s.last_lit = s.matches = 0;
  }
  function bi_windup(s) {
    if (s.bi_valid > 8) {
      put_short(s, s.bi_buf);
    } else if (s.bi_valid > 0) {
      s.pending_buf[s.pending++] = s.bi_buf;
    }
    s.bi_buf = 0;
    s.bi_valid = 0;
  }
  function copy_block(s, buf, len, header) {
    bi_windup(s);
    if (header) {
      put_short(s, len);
      put_short(s, ~len);
    }
    utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
    s.pending += len;
  }
  function smaller(tree, n, m, depth) {
    var _n2 = n * 2;
    var _m2 = m * 2;
    return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
  }
  function pqdownheap(s, tree, k) {
    var v = s.heap[k];
    var j = k << 1;
    while (j <= s.heap_len) {
      if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
        j++;
      }
      if (smaller(tree, v, s.heap[j], s.depth)) {
        break;
      }
      s.heap[k] = s.heap[j];
      k = j;
      j <<= 1;
    }
    s.heap[k] = v;
  }
  function compress_block(s, ltree, dtree) {
    var dist;
    var lc;
    var lx = 0;
    var code;
    var extra;
    if (s.last_lit !== 0) {
      do {
        dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
        lc = s.pending_buf[s.l_buf + lx];
        lx++;
        if (dist === 0) {
          send_code(s, lc, ltree);
        } else {
          code = _length_code[lc];
          send_code(s, code + LITERALS + 1, ltree);
          extra = extra_lbits[code];
          if (extra !== 0) {
            lc -= base_length[code];
            send_bits(s, lc, extra);
          }
          dist--;
          code = d_code(dist);
          send_code(s, code, dtree);
          extra = extra_dbits[code];
          if (extra !== 0) {
            dist -= base_dist[code];
            send_bits(s, dist, extra);
          }
        }
      } while (lx < s.last_lit);
    }
    send_code(s, END_BLOCK, ltree);
  }
  function build_tree(s, desc) {
    var tree = desc.dyn_tree;
    var stree = desc.stat_desc.static_tree;
    var has_stree = desc.stat_desc.has_stree;
    var elems = desc.stat_desc.elems;
    var n, m;
    var max_code = -1;
    var node;
    s.heap_len = 0;
    s.heap_max = HEAP_SIZE;
    for (n = 0;n < elems; n++) {
      if (tree[n * 2] !== 0) {
        s.heap[++s.heap_len] = max_code = n;
        s.depth[n] = 0;
      } else {
        tree[n * 2 + 1] = 0;
      }
    }
    while (s.heap_len < 2) {
      node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
      tree[node * 2] = 1;
      s.depth[node] = 0;
      s.opt_len--;
      if (has_stree) {
        s.static_len -= stree[node * 2 + 1];
      }
    }
    desc.max_code = max_code;
    for (n = s.heap_len >> 1;n >= 1; n--) {
      pqdownheap(s, tree, n);
    }
    node = elems;
    do {
      n = s.heap[1];
      s.heap[1] = s.heap[s.heap_len--];
      pqdownheap(s, tree, 1);
      m = s.heap[1];
      s.heap[--s.heap_max] = n;
      s.heap[--s.heap_max] = m;
      tree[node * 2] = tree[n * 2] + tree[m * 2];
      s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
      tree[n * 2 + 1] = tree[m * 2 + 1] = node;
      s.heap[1] = node++;
      pqdownheap(s, tree, 1);
    } while (s.heap_len >= 2);
    s.heap[--s.heap_max] = s.heap[1];
    gen_bitlen(s, desc);
    gen_codes(tree, max_code, s.bl_count);
  }
  function scan_tree(s, tree, max_code) {
    var n;
    var prevlen = -1;
    var curlen;
    var nextlen = tree[0 * 2 + 1];
    var count = 0;
    var max_count = 7;
    var min_count = 4;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    }
    tree[(max_code + 1) * 2 + 1] = 65535;
    for (n = 0;n <= max_code; n++) {
      curlen = nextlen;
      nextlen = tree[(n + 1) * 2 + 1];
      if (++count < max_count && curlen === nextlen) {
        continue;
      } else if (count < min_count) {
        s.bl_tree[curlen * 2] += count;
      } else if (curlen !== 0) {
        if (curlen !== prevlen) {
          s.bl_tree[curlen * 2]++;
        }
        s.bl_tree[REP_3_6 * 2]++;
      } else if (count <= 10) {
        s.bl_tree[REPZ_3_10 * 2]++;
      } else {
        s.bl_tree[REPZ_11_138 * 2]++;
      }
      count = 0;
      prevlen = curlen;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      } else if (curlen === nextlen) {
        max_count = 6;
        min_count = 3;
      } else {
        max_count = 7;
        min_count = 4;
      }
    }
  }
  function send_tree(s, tree, max_code) {
    var n;
    var prevlen = -1;
    var curlen;
    var nextlen = tree[0 * 2 + 1];
    var count = 0;
    var max_count = 7;
    var min_count = 4;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    }
    for (n = 0;n <= max_code; n++) {
      curlen = nextlen;
      nextlen = tree[(n + 1) * 2 + 1];
      if (++count < max_count && curlen === nextlen) {
        continue;
      } else if (count < min_count) {
        do {
          send_code(s, curlen, s.bl_tree);
        } while (--count !== 0);
      } else if (curlen !== 0) {
        if (curlen !== prevlen) {
          send_code(s, curlen, s.bl_tree);
          count--;
        }
        send_code(s, REP_3_6, s.bl_tree);
        send_bits(s, count - 3, 2);
      } else if (count <= 10) {
        send_code(s, REPZ_3_10, s.bl_tree);
        send_bits(s, count - 3, 3);
      } else {
        send_code(s, REPZ_11_138, s.bl_tree);
        send_bits(s, count - 11, 7);
      }
      count = 0;
      prevlen = curlen;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      } else if (curlen === nextlen) {
        max_count = 6;
        min_count = 3;
      } else {
        max_count = 7;
        min_count = 4;
      }
    }
  }
  function build_bl_tree(s) {
    var max_blindex;
    scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
    scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
    build_tree(s, s.bl_desc);
    for (max_blindex = BL_CODES - 1;max_blindex >= 3; max_blindex--) {
      if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
        break;
      }
    }
    s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
    return max_blindex;
  }
  function send_all_trees(s, lcodes, dcodes, blcodes) {
    var rank;
    send_bits(s, lcodes - 257, 5);
    send_bits(s, dcodes - 1, 5);
    send_bits(s, blcodes - 4, 4);
    for (rank = 0;rank < blcodes; rank++) {
      send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
    }
    send_tree(s, s.dyn_ltree, lcodes - 1);
    send_tree(s, s.dyn_dtree, dcodes - 1);
  }
  function detect_data_type(s) {
    var black_mask = 4093624447;
    var n;
    for (n = 0;n <= 31; n++, black_mask >>>= 1) {
      if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
        return Z_BINARY;
      }
    }
    if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
      return Z_TEXT;
    }
    for (n = 32;n < LITERALS; n++) {
      if (s.dyn_ltree[n * 2] !== 0) {
        return Z_TEXT;
      }
    }
    return Z_BINARY;
  }
  var static_init_done = false;
  function _tr_init(s) {
    if (!static_init_done) {
      tr_static_init();
      static_init_done = true;
    }
    s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
    s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
    s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
    s.bi_buf = 0;
    s.bi_valid = 0;
    init_block(s);
  }
  function _tr_stored_block(s, buf, stored_len, last) {
    send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
    copy_block(s, buf, stored_len, true);
  }
  function _tr_align(s) {
    send_bits(s, STATIC_TREES << 1, 3);
    send_code(s, END_BLOCK, static_ltree);
    bi_flush(s);
  }
  function _tr_flush_block(s, buf, stored_len, last) {
    var opt_lenb, static_lenb;
    var max_blindex = 0;
    if (s.level > 0) {
      if (s.strm.data_type === Z_UNKNOWN) {
        s.strm.data_type = detect_data_type(s);
      }
      build_tree(s, s.l_desc);
      build_tree(s, s.d_desc);
      max_blindex = build_bl_tree(s);
      opt_lenb = s.opt_len + 3 + 7 >>> 3;
      static_lenb = s.static_len + 3 + 7 >>> 3;
      if (static_lenb <= opt_lenb) {
        opt_lenb = static_lenb;
      }
    } else {
      opt_lenb = static_lenb = stored_len + 5;
    }
    if (stored_len + 4 <= opt_lenb && buf !== -1) {
      _tr_stored_block(s, buf, stored_len, last);
    } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
      send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
      compress_block(s, static_ltree, static_dtree);
    } else {
      send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
      send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
      compress_block(s, s.dyn_ltree, s.dyn_dtree);
    }
    init_block(s);
    if (last) {
      bi_windup(s);
    }
  }
  function _tr_tally(s, dist, lc) {
    s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 255;
    s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 255;
    s.pending_buf[s.l_buf + s.last_lit] = lc & 255;
    s.last_lit++;
    if (dist === 0) {
      s.dyn_ltree[lc * 2]++;
    } else {
      s.matches++;
      dist--;
      s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
      s.dyn_dtree[d_code(dist) * 2]++;
    }
    return s.last_lit === s.lit_bufsize - 1;
  }
  exports._tr_init = _tr_init;
  exports._tr_stored_block = _tr_stored_block;
  exports._tr_flush_block = _tr_flush_block;
  exports._tr_tally = _tr_tally;
  exports._tr_align = _tr_align;
});

// node_modules/pako/lib/zlib/adler32.js
var require_adler32 = __commonJS((exports, module) => {
  function adler32(adler, buf, len, pos) {
    var s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
    while (len !== 0) {
      n = len > 2000 ? 2000 : len;
      len -= n;
      do {
        s1 = s1 + buf[pos++] | 0;
        s2 = s2 + s1 | 0;
      } while (--n);
      s1 %= 65521;
      s2 %= 65521;
    }
    return s1 | s2 << 16 | 0;
  }
  module.exports = adler32;
});

// node_modules/pako/lib/zlib/crc32.js
var require_crc322 = __commonJS((exports, module) => {
  function makeTable() {
    var c, table = [];
    for (var n = 0;n < 256; n++) {
      c = n;
      for (var k = 0;k < 8; k++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[n] = c;
    }
    return table;
  }
  var crcTable = makeTable();
  function crc32(crc, buf, len, pos) {
    var t = crcTable, end = pos + len;
    crc ^= -1;
    for (var i = pos;i < end; i++) {
      crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
    }
    return crc ^ -1;
  }
  module.exports = crc32;
});

// node_modules/pako/lib/zlib/messages.js
var require_messages = __commonJS((exports, module) => {
  module.exports = {
    2: "need dictionary",
    1: "stream end",
    0: "",
    "-1": "file error",
    "-2": "stream error",
    "-3": "data error",
    "-4": "insufficient memory",
    "-5": "buffer error",
    "-6": "incompatible version"
  };
});

// node_modules/pako/lib/zlib/deflate.js
var require_deflate = __commonJS((exports) => {
  var utils = require_common();
  var trees = require_trees();
  var adler32 = require_adler32();
  var crc32 = require_crc322();
  var msg = require_messages();
  var Z_NO_FLUSH = 0;
  var Z_PARTIAL_FLUSH = 1;
  var Z_FULL_FLUSH = 3;
  var Z_FINISH = 4;
  var Z_BLOCK = 5;
  var Z_OK = 0;
  var Z_STREAM_END = 1;
  var Z_STREAM_ERROR = -2;
  var Z_DATA_ERROR = -3;
  var Z_BUF_ERROR = -5;
  var Z_DEFAULT_COMPRESSION = -1;
  var Z_FILTERED = 1;
  var Z_HUFFMAN_ONLY = 2;
  var Z_RLE = 3;
  var Z_FIXED = 4;
  var Z_DEFAULT_STRATEGY = 0;
  var Z_UNKNOWN = 2;
  var Z_DEFLATED = 8;
  var MAX_MEM_LEVEL = 9;
  var MAX_WBITS = 15;
  var DEF_MEM_LEVEL = 8;
  var LENGTH_CODES = 29;
  var LITERALS = 256;
  var L_CODES = LITERALS + 1 + LENGTH_CODES;
  var D_CODES = 30;
  var BL_CODES = 19;
  var HEAP_SIZE = 2 * L_CODES + 1;
  var MAX_BITS = 15;
  var MIN_MATCH = 3;
  var MAX_MATCH = 258;
  var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
  var PRESET_DICT = 32;
  var INIT_STATE = 42;
  var EXTRA_STATE = 69;
  var NAME_STATE = 73;
  var COMMENT_STATE = 91;
  var HCRC_STATE = 103;
  var BUSY_STATE = 113;
  var FINISH_STATE = 666;
  var BS_NEED_MORE = 1;
  var BS_BLOCK_DONE = 2;
  var BS_FINISH_STARTED = 3;
  var BS_FINISH_DONE = 4;
  var OS_CODE = 3;
  function err(strm, errorCode) {
    strm.msg = msg[errorCode];
    return errorCode;
  }
  function rank(f) {
    return (f << 1) - (f > 4 ? 9 : 0);
  }
  function zero(buf) {
    var len = buf.length;
    while (--len >= 0) {
      buf[len] = 0;
    }
  }
  function flush_pending(strm) {
    var s = strm.state;
    var len = s.pending;
    if (len > strm.avail_out) {
      len = strm.avail_out;
    }
    if (len === 0) {
      return;
    }
    utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
    strm.next_out += len;
    s.pending_out += len;
    strm.total_out += len;
    strm.avail_out -= len;
    s.pending -= len;
    if (s.pending === 0) {
      s.pending_out = 0;
    }
  }
  function flush_block_only(s, last) {
    trees._tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
    s.block_start = s.strstart;
    flush_pending(s.strm);
  }
  function put_byte(s, b) {
    s.pending_buf[s.pending++] = b;
  }
  function putShortMSB(s, b) {
    s.pending_buf[s.pending++] = b >>> 8 & 255;
    s.pending_buf[s.pending++] = b & 255;
  }
  function read_buf(strm, buf, start, size) {
    var len = strm.avail_in;
    if (len > size) {
      len = size;
    }
    if (len === 0) {
      return 0;
    }
    strm.avail_in -= len;
    utils.arraySet(buf, strm.input, strm.next_in, len, start);
    if (strm.state.wrap === 1) {
      strm.adler = adler32(strm.adler, buf, len, start);
    } else if (strm.state.wrap === 2) {
      strm.adler = crc32(strm.adler, buf, len, start);
    }
    strm.next_in += len;
    strm.total_in += len;
    return len;
  }
  function longest_match(s, cur_match) {
    var chain_length = s.max_chain_length;
    var scan = s.strstart;
    var match;
    var len;
    var best_len = s.prev_length;
    var nice_match = s.nice_match;
    var limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
    var _win = s.window;
    var wmask = s.w_mask;
    var prev = s.prev;
    var strend = s.strstart + MAX_MATCH;
    var scan_end1 = _win[scan + best_len - 1];
    var scan_end = _win[scan + best_len];
    if (s.prev_length >= s.good_match) {
      chain_length >>= 2;
    }
    if (nice_match > s.lookahead) {
      nice_match = s.lookahead;
    }
    do {
      match = cur_match;
      if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
        continue;
      }
      scan += 2;
      match++;
      do {} while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
      len = MAX_MATCH - (strend - scan);
      scan = strend - MAX_MATCH;
      if (len > best_len) {
        s.match_start = cur_match;
        best_len = len;
        if (len >= nice_match) {
          break;
        }
        scan_end1 = _win[scan + best_len - 1];
        scan_end = _win[scan + best_len];
      }
    } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
    if (best_len <= s.lookahead) {
      return best_len;
    }
    return s.lookahead;
  }
  function fill_window(s) {
    var _w_size = s.w_size;
    var p, n, m, more, str;
    do {
      more = s.window_size - s.lookahead - s.strstart;
      if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
        utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
        s.match_start -= _w_size;
        s.strstart -= _w_size;
        s.block_start -= _w_size;
        n = s.hash_size;
        p = n;
        do {
          m = s.head[--p];
          s.head[p] = m >= _w_size ? m - _w_size : 0;
        } while (--n);
        n = _w_size;
        p = n;
        do {
          m = s.prev[--p];
          s.prev[p] = m >= _w_size ? m - _w_size : 0;
        } while (--n);
        more += _w_size;
      }
      if (s.strm.avail_in === 0) {
        break;
      }
      n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
      s.lookahead += n;
      if (s.lookahead + s.insert >= MIN_MATCH) {
        str = s.strstart - s.insert;
        s.ins_h = s.window[str];
        s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + 1]) & s.hash_mask;
        while (s.insert) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
          s.insert--;
          if (s.lookahead + s.insert < MIN_MATCH) {
            break;
          }
        }
      }
    } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
  }
  function deflate_stored(s, flush) {
    var max_block_size = 65535;
    if (max_block_size > s.pending_buf_size - 5) {
      max_block_size = s.pending_buf_size - 5;
    }
    for (;; ) {
      if (s.lookahead <= 1) {
        fill_window(s);
        if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      s.strstart += s.lookahead;
      s.lookahead = 0;
      var max_start = s.block_start + max_block_size;
      if (s.strstart === 0 || s.strstart >= max_start) {
        s.lookahead = s.strstart - max_start;
        s.strstart = max_start;
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = 0;
    if (flush === Z_FINISH) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.strstart > s.block_start) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_NEED_MORE;
  }
  function deflate_fast(s, flush) {
    var hash_head;
    var bflush;
    for (;; ) {
      if (s.lookahead < MIN_LOOKAHEAD) {
        fill_window(s);
        if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      hash_head = 0;
      if (s.lookahead >= MIN_MATCH) {
        s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = s.strstart;
      }
      if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
        s.match_length = longest_match(s, hash_head);
      }
      if (s.match_length >= MIN_MATCH) {
        bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
        s.lookahead -= s.match_length;
        if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
          s.match_length--;
          do {
            s.strstart++;
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
          } while (--s.match_length !== 0);
          s.strstart++;
        } else {
          s.strstart += s.match_length;
          s.match_length = 0;
          s.ins_h = s.window[s.strstart];
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + 1]) & s.hash_mask;
        }
      } else {
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
      }
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
    if (flush === Z_FINISH) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.last_lit) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  }
  function deflate_slow(s, flush) {
    var hash_head;
    var bflush;
    var max_insert;
    for (;; ) {
      if (s.lookahead < MIN_LOOKAHEAD) {
        fill_window(s);
        if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      hash_head = 0;
      if (s.lookahead >= MIN_MATCH) {
        s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = s.strstart;
      }
      s.prev_length = s.match_length;
      s.prev_match = s.match_start;
      s.match_length = MIN_MATCH - 1;
      if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
        s.match_length = longest_match(s, hash_head);
        if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
          s.match_length = MIN_MATCH - 1;
        }
      }
      if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
        max_insert = s.strstart + s.lookahead - MIN_MATCH;
        bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
        s.lookahead -= s.prev_length - 1;
        s.prev_length -= 2;
        do {
          if (++s.strstart <= max_insert) {
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
          }
        } while (--s.prev_length !== 0);
        s.match_available = 0;
        s.match_length = MIN_MATCH - 1;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      } else if (s.match_available) {
        bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
        if (bflush) {
          flush_block_only(s, false);
        }
        s.strstart++;
        s.lookahead--;
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      } else {
        s.match_available = 1;
        s.strstart++;
        s.lookahead--;
      }
    }
    if (s.match_available) {
      bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
      s.match_available = 0;
    }
    s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
    if (flush === Z_FINISH) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.last_lit) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  }
  function deflate_rle(s, flush) {
    var bflush;
    var prev;
    var scan, strend;
    var _win = s.window;
    for (;; ) {
      if (s.lookahead <= MAX_MATCH) {
        fill_window(s);
        if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }
      s.match_length = 0;
      if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
        scan = s.strstart - 1;
        prev = _win[scan];
        if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
          strend = s.strstart + MAX_MATCH;
          do {} while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
          s.match_length = MAX_MATCH - (strend - scan);
          if (s.match_length > s.lookahead) {
            s.match_length = s.lookahead;
          }
        }
      }
      if (s.match_length >= MIN_MATCH) {
        bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);
        s.lookahead -= s.match_length;
        s.strstart += s.match_length;
        s.match_length = 0;
      } else {
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
      }
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = 0;
    if (flush === Z_FINISH) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.last_lit) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  }
  function deflate_huff(s, flush) {
    var bflush;
    for (;; ) {
      if (s.lookahead === 0) {
        fill_window(s);
        if (s.lookahead === 0) {
          if (flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          break;
        }
      }
      s.match_length = 0;
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    }
    s.insert = 0;
    if (flush === Z_FINISH) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }
      return BS_FINISH_DONE;
    }
    if (s.last_lit) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    return BS_BLOCK_DONE;
  }
  function Config(good_length, max_lazy, nice_length, max_chain, func) {
    this.good_length = good_length;
    this.max_lazy = max_lazy;
    this.nice_length = nice_length;
    this.max_chain = max_chain;
    this.func = func;
  }
  var configuration_table;
  configuration_table = [
    new Config(0, 0, 0, 0, deflate_stored),
    new Config(4, 4, 8, 4, deflate_fast),
    new Config(4, 5, 16, 8, deflate_fast),
    new Config(4, 6, 32, 32, deflate_fast),
    new Config(4, 4, 16, 16, deflate_slow),
    new Config(8, 16, 32, 32, deflate_slow),
    new Config(8, 16, 128, 128, deflate_slow),
    new Config(8, 32, 128, 256, deflate_slow),
    new Config(32, 128, 258, 1024, deflate_slow),
    new Config(32, 258, 258, 4096, deflate_slow)
  ];
  function lm_init(s) {
    s.window_size = 2 * s.w_size;
    zero(s.head);
    s.max_lazy_match = configuration_table[s.level].max_lazy;
    s.good_match = configuration_table[s.level].good_length;
    s.nice_match = configuration_table[s.level].nice_length;
    s.max_chain_length = configuration_table[s.level].max_chain;
    s.strstart = 0;
    s.block_start = 0;
    s.lookahead = 0;
    s.insert = 0;
    s.match_length = s.prev_length = MIN_MATCH - 1;
    s.match_available = 0;
    s.ins_h = 0;
  }
  function DeflateState() {
    this.strm = null;
    this.status = 0;
    this.pending_buf = null;
    this.pending_buf_size = 0;
    this.pending_out = 0;
    this.pending = 0;
    this.wrap = 0;
    this.gzhead = null;
    this.gzindex = 0;
    this.method = Z_DEFLATED;
    this.last_flush = -1;
    this.w_size = 0;
    this.w_bits = 0;
    this.w_mask = 0;
    this.window = null;
    this.window_size = 0;
    this.prev = null;
    this.head = null;
    this.ins_h = 0;
    this.hash_size = 0;
    this.hash_bits = 0;
    this.hash_mask = 0;
    this.hash_shift = 0;
    this.block_start = 0;
    this.match_length = 0;
    this.prev_match = 0;
    this.match_available = 0;
    this.strstart = 0;
    this.match_start = 0;
    this.lookahead = 0;
    this.prev_length = 0;
    this.max_chain_length = 0;
    this.max_lazy_match = 0;
    this.level = 0;
    this.strategy = 0;
    this.good_match = 0;
    this.nice_match = 0;
    this.dyn_ltree = new utils.Buf16(HEAP_SIZE * 2);
    this.dyn_dtree = new utils.Buf16((2 * D_CODES + 1) * 2);
    this.bl_tree = new utils.Buf16((2 * BL_CODES + 1) * 2);
    zero(this.dyn_ltree);
    zero(this.dyn_dtree);
    zero(this.bl_tree);
    this.l_desc = null;
    this.d_desc = null;
    this.bl_desc = null;
    this.bl_count = new utils.Buf16(MAX_BITS + 1);
    this.heap = new utils.Buf16(2 * L_CODES + 1);
    zero(this.heap);
    this.heap_len = 0;
    this.heap_max = 0;
    this.depth = new utils.Buf16(2 * L_CODES + 1);
    zero(this.depth);
    this.l_buf = 0;
    this.lit_bufsize = 0;
    this.last_lit = 0;
    this.d_buf = 0;
    this.opt_len = 0;
    this.static_len = 0;
    this.matches = 0;
    this.insert = 0;
    this.bi_buf = 0;
    this.bi_valid = 0;
  }
  function deflateResetKeep(strm) {
    var s;
    if (!strm || !strm.state) {
      return err(strm, Z_STREAM_ERROR);
    }
    strm.total_in = strm.total_out = 0;
    strm.data_type = Z_UNKNOWN;
    s = strm.state;
    s.pending = 0;
    s.pending_out = 0;
    if (s.wrap < 0) {
      s.wrap = -s.wrap;
    }
    s.status = s.wrap ? INIT_STATE : BUSY_STATE;
    strm.adler = s.wrap === 2 ? 0 : 1;
    s.last_flush = Z_NO_FLUSH;
    trees._tr_init(s);
    return Z_OK;
  }
  function deflateReset(strm) {
    var ret = deflateResetKeep(strm);
    if (ret === Z_OK) {
      lm_init(strm.state);
    }
    return ret;
  }
  function deflateSetHeader(strm, head) {
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    if (strm.state.wrap !== 2) {
      return Z_STREAM_ERROR;
    }
    strm.state.gzhead = head;
    return Z_OK;
  }
  function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
    if (!strm) {
      return Z_STREAM_ERROR;
    }
    var wrap = 1;
    if (level === Z_DEFAULT_COMPRESSION) {
      level = 6;
    }
    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else if (windowBits > 15) {
      wrap = 2;
      windowBits -= 16;
    }
    if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) {
      return err(strm, Z_STREAM_ERROR);
    }
    if (windowBits === 8) {
      windowBits = 9;
    }
    var s = new DeflateState;
    strm.state = s;
    s.strm = strm;
    s.wrap = wrap;
    s.gzhead = null;
    s.w_bits = windowBits;
    s.w_size = 1 << s.w_bits;
    s.w_mask = s.w_size - 1;
    s.hash_bits = memLevel + 7;
    s.hash_size = 1 << s.hash_bits;
    s.hash_mask = s.hash_size - 1;
    s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
    s.window = new utils.Buf8(s.w_size * 2);
    s.head = new utils.Buf16(s.hash_size);
    s.prev = new utils.Buf16(s.w_size);
    s.lit_bufsize = 1 << memLevel + 6;
    s.pending_buf_size = s.lit_bufsize * 4;
    s.pending_buf = new utils.Buf8(s.pending_buf_size);
    s.d_buf = 1 * s.lit_bufsize;
    s.l_buf = (1 + 2) * s.lit_bufsize;
    s.level = level;
    s.strategy = strategy;
    s.method = method;
    return deflateReset(strm);
  }
  function deflateInit(strm, level) {
    return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
  }
  function deflate(strm, flush) {
    var old_flush, s;
    var beg, val;
    if (!strm || !strm.state || flush > Z_BLOCK || flush < 0) {
      return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
    }
    s = strm.state;
    if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH) {
      return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
    }
    s.strm = strm;
    old_flush = s.last_flush;
    s.last_flush = flush;
    if (s.status === INIT_STATE) {
      if (s.wrap === 2) {
        strm.adler = 0;
        put_byte(s, 31);
        put_byte(s, 139);
        put_byte(s, 8);
        if (!s.gzhead) {
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, 0);
          put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
          put_byte(s, OS_CODE);
          s.status = BUSY_STATE;
        } else {
          put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
          put_byte(s, s.gzhead.time & 255);
          put_byte(s, s.gzhead.time >> 8 & 255);
          put_byte(s, s.gzhead.time >> 16 & 255);
          put_byte(s, s.gzhead.time >> 24 & 255);
          put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
          put_byte(s, s.gzhead.os & 255);
          if (s.gzhead.extra && s.gzhead.extra.length) {
            put_byte(s, s.gzhead.extra.length & 255);
            put_byte(s, s.gzhead.extra.length >> 8 & 255);
          }
          if (s.gzhead.hcrc) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
          }
          s.gzindex = 0;
          s.status = EXTRA_STATE;
        }
      } else {
        var header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8;
        var level_flags = -1;
        if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
          level_flags = 0;
        } else if (s.level < 6) {
          level_flags = 1;
        } else if (s.level === 6) {
          level_flags = 2;
        } else {
          level_flags = 3;
        }
        header |= level_flags << 6;
        if (s.strstart !== 0) {
          header |= PRESET_DICT;
        }
        header += 31 - header % 31;
        s.status = BUSY_STATE;
        putShortMSB(s, header);
        if (s.strstart !== 0) {
          putShortMSB(s, strm.adler >>> 16);
          putShortMSB(s, strm.adler & 65535);
        }
        strm.adler = 1;
      }
    }
    if (s.status === EXTRA_STATE) {
      if (s.gzhead.extra) {
        beg = s.pending;
        while (s.gzindex < (s.gzhead.extra.length & 65535)) {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            flush_pending(strm);
            beg = s.pending;
            if (s.pending === s.pending_buf_size) {
              break;
            }
          }
          put_byte(s, s.gzhead.extra[s.gzindex] & 255);
          s.gzindex++;
        }
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        if (s.gzindex === s.gzhead.extra.length) {
          s.gzindex = 0;
          s.status = NAME_STATE;
        }
      } else {
        s.status = NAME_STATE;
      }
    }
    if (s.status === NAME_STATE) {
      if (s.gzhead.name) {
        beg = s.pending;
        do {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            flush_pending(strm);
            beg = s.pending;
            if (s.pending === s.pending_buf_size) {
              val = 1;
              break;
            }
          }
          if (s.gzindex < s.gzhead.name.length) {
            val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
          } else {
            val = 0;
          }
          put_byte(s, val);
        } while (val !== 0);
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        if (val === 0) {
          s.gzindex = 0;
          s.status = COMMENT_STATE;
        }
      } else {
        s.status = COMMENT_STATE;
      }
    }
    if (s.status === COMMENT_STATE) {
      if (s.gzhead.comment) {
        beg = s.pending;
        do {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
            }
            flush_pending(strm);
            beg = s.pending;
            if (s.pending === s.pending_buf_size) {
              val = 1;
              break;
            }
          }
          if (s.gzindex < s.gzhead.comment.length) {
            val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
          } else {
            val = 0;
          }
          put_byte(s, val);
        } while (val !== 0);
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        if (val === 0) {
          s.status = HCRC_STATE;
        }
      } else {
        s.status = HCRC_STATE;
      }
    }
    if (s.status === HCRC_STATE) {
      if (s.gzhead.hcrc) {
        if (s.pending + 2 > s.pending_buf_size) {
          flush_pending(strm);
        }
        if (s.pending + 2 <= s.pending_buf_size) {
          put_byte(s, strm.adler & 255);
          put_byte(s, strm.adler >> 8 & 255);
          strm.adler = 0;
          s.status = BUSY_STATE;
        }
      } else {
        s.status = BUSY_STATE;
      }
    }
    if (s.pending !== 0) {
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK;
      }
    } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
      return err(strm, Z_BUF_ERROR);
    }
    if (s.status === FINISH_STATE && strm.avail_in !== 0) {
      return err(strm, Z_BUF_ERROR);
    }
    if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
      var bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
      if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
        s.status = FINISH_STATE;
      }
      if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
        if (strm.avail_out === 0) {
          s.last_flush = -1;
        }
        return Z_OK;
      }
      if (bstate === BS_BLOCK_DONE) {
        if (flush === Z_PARTIAL_FLUSH) {
          trees._tr_align(s);
        } else if (flush !== Z_BLOCK) {
          trees._tr_stored_block(s, 0, 0, false);
          if (flush === Z_FULL_FLUSH) {
            zero(s.head);
            if (s.lookahead === 0) {
              s.strstart = 0;
              s.block_start = 0;
              s.insert = 0;
            }
          }
        }
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      }
    }
    if (flush !== Z_FINISH) {
      return Z_OK;
    }
    if (s.wrap <= 0) {
      return Z_STREAM_END;
    }
    if (s.wrap === 2) {
      put_byte(s, strm.adler & 255);
      put_byte(s, strm.adler >> 8 & 255);
      put_byte(s, strm.adler >> 16 & 255);
      put_byte(s, strm.adler >> 24 & 255);
      put_byte(s, strm.total_in & 255);
      put_byte(s, strm.total_in >> 8 & 255);
      put_byte(s, strm.total_in >> 16 & 255);
      put_byte(s, strm.total_in >> 24 & 255);
    } else {
      putShortMSB(s, strm.adler >>> 16);
      putShortMSB(s, strm.adler & 65535);
    }
    flush_pending(strm);
    if (s.wrap > 0) {
      s.wrap = -s.wrap;
    }
    return s.pending !== 0 ? Z_OK : Z_STREAM_END;
  }
  function deflateEnd(strm) {
    var status;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    status = strm.state.status;
    if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) {
      return err(strm, Z_STREAM_ERROR);
    }
    strm.state = null;
    return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
  }
  function deflateSetDictionary(strm, dictionary) {
    var dictLength = dictionary.length;
    var s;
    var str, n;
    var wrap;
    var avail;
    var next;
    var input;
    var tmpDict;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    s = strm.state;
    wrap = s.wrap;
    if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
      return Z_STREAM_ERROR;
    }
    if (wrap === 1) {
      strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
    }
    s.wrap = 0;
    if (dictLength >= s.w_size) {
      if (wrap === 0) {
        zero(s.head);
        s.strstart = 0;
        s.block_start = 0;
        s.insert = 0;
      }
      tmpDict = new utils.Buf8(s.w_size);
      utils.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
      dictionary = tmpDict;
      dictLength = s.w_size;
    }
    avail = strm.avail_in;
    next = strm.next_in;
    input = strm.input;
    strm.avail_in = dictLength;
    strm.next_in = 0;
    strm.input = dictionary;
    fill_window(s);
    while (s.lookahead >= MIN_MATCH) {
      str = s.strstart;
      n = s.lookahead - (MIN_MATCH - 1);
      do {
        s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
      } while (--n);
      s.strstart = str;
      s.lookahead = MIN_MATCH - 1;
      fill_window(s);
    }
    s.strstart += s.lookahead;
    s.block_start = s.strstart;
    s.insert = s.lookahead;
    s.lookahead = 0;
    s.match_length = s.prev_length = MIN_MATCH - 1;
    s.match_available = 0;
    strm.next_in = next;
    strm.input = input;
    strm.avail_in = avail;
    s.wrap = wrap;
    return Z_OK;
  }
  exports.deflateInit = deflateInit;
  exports.deflateInit2 = deflateInit2;
  exports.deflateReset = deflateReset;
  exports.deflateResetKeep = deflateResetKeep;
  exports.deflateSetHeader = deflateSetHeader;
  exports.deflate = deflate;
  exports.deflateEnd = deflateEnd;
  exports.deflateSetDictionary = deflateSetDictionary;
  exports.deflateInfo = "pako deflate (from Nodeca project)";
});

// node_modules/pako/lib/utils/strings.js
var require_strings = __commonJS((exports) => {
  var utils = require_common();
  var STR_APPLY_OK = true;
  var STR_APPLY_UIA_OK = true;
  try {
    String.fromCharCode.apply(null, [0]);
  } catch (__) {
    STR_APPLY_OK = false;
  }
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch (__) {
    STR_APPLY_UIA_OK = false;
  }
  var _utf8len = new utils.Buf8(256);
  for (q = 0;q < 256; q++) {
    _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
  }
  var q;
  _utf8len[254] = _utf8len[254] = 1;
  exports.string2buf = function(str) {
    var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
    for (m_pos = 0;m_pos < str_len; m_pos++) {
      c = str.charCodeAt(m_pos);
      if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
        c2 = str.charCodeAt(m_pos + 1);
        if ((c2 & 64512) === 56320) {
          c = 65536 + (c - 55296 << 10) + (c2 - 56320);
          m_pos++;
        }
      }
      buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
    }
    buf = new utils.Buf8(buf_len);
    for (i = 0, m_pos = 0;i < buf_len; m_pos++) {
      c = str.charCodeAt(m_pos);
      if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
        c2 = str.charCodeAt(m_pos + 1);
        if ((c2 & 64512) === 56320) {
          c = 65536 + (c - 55296 << 10) + (c2 - 56320);
          m_pos++;
        }
      }
      if (c < 128) {
        buf[i++] = c;
      } else if (c < 2048) {
        buf[i++] = 192 | c >>> 6;
        buf[i++] = 128 | c & 63;
      } else if (c < 65536) {
        buf[i++] = 224 | c >>> 12;
        buf[i++] = 128 | c >>> 6 & 63;
        buf[i++] = 128 | c & 63;
      } else {
        buf[i++] = 240 | c >>> 18;
        buf[i++] = 128 | c >>> 12 & 63;
        buf[i++] = 128 | c >>> 6 & 63;
        buf[i++] = 128 | c & 63;
      }
    }
    return buf;
  };
  function buf2binstring(buf, len) {
    if (len < 65534) {
      if (buf.subarray && STR_APPLY_UIA_OK || !buf.subarray && STR_APPLY_OK) {
        return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
      }
    }
    var result = "";
    for (var i = 0;i < len; i++) {
      result += String.fromCharCode(buf[i]);
    }
    return result;
  }
  exports.buf2binstring = function(buf) {
    return buf2binstring(buf, buf.length);
  };
  exports.binstring2buf = function(str) {
    var buf = new utils.Buf8(str.length);
    for (var i = 0, len = buf.length;i < len; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  };
  exports.buf2string = function(buf, max) {
    var i, out, c, c_len;
    var len = max || buf.length;
    var utf16buf = new Array(len * 2);
    for (out = 0, i = 0;i < len; ) {
      c = buf[i++];
      if (c < 128) {
        utf16buf[out++] = c;
        continue;
      }
      c_len = _utf8len[c];
      if (c_len > 4) {
        utf16buf[out++] = 65533;
        i += c_len - 1;
        continue;
      }
      c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
      while (c_len > 1 && i < len) {
        c = c << 6 | buf[i++] & 63;
        c_len--;
      }
      if (c_len > 1) {
        utf16buf[out++] = 65533;
        continue;
      }
      if (c < 65536) {
        utf16buf[out++] = c;
      } else {
        c -= 65536;
        utf16buf[out++] = 55296 | c >> 10 & 1023;
        utf16buf[out++] = 56320 | c & 1023;
      }
    }
    return buf2binstring(utf16buf, out);
  };
  exports.utf8border = function(buf, max) {
    var pos;
    max = max || buf.length;
    if (max > buf.length) {
      max = buf.length;
    }
    pos = max - 1;
    while (pos >= 0 && (buf[pos] & 192) === 128) {
      pos--;
    }
    if (pos < 0) {
      return max;
    }
    if (pos === 0) {
      return max;
    }
    return pos + _utf8len[buf[pos]] > max ? pos : max;
  };
});

// node_modules/pako/lib/zlib/zstream.js
var require_zstream = __commonJS((exports, module) => {
  function ZStream() {
    this.input = null;
    this.next_in = 0;
    this.avail_in = 0;
    this.total_in = 0;
    this.output = null;
    this.next_out = 0;
    this.avail_out = 0;
    this.total_out = 0;
    this.msg = "";
    this.state = null;
    this.data_type = 2;
    this.adler = 0;
  }
  module.exports = ZStream;
});

// node_modules/pako/lib/deflate.js
var require_deflate2 = __commonJS((exports) => {
  var zlib_deflate = require_deflate();
  var utils = require_common();
  var strings = require_strings();
  var msg = require_messages();
  var ZStream = require_zstream();
  var toString = Object.prototype.toString;
  var Z_NO_FLUSH = 0;
  var Z_FINISH = 4;
  var Z_OK = 0;
  var Z_STREAM_END = 1;
  var Z_SYNC_FLUSH = 2;
  var Z_DEFAULT_COMPRESSION = -1;
  var Z_DEFAULT_STRATEGY = 0;
  var Z_DEFLATED = 8;
  function Deflate(options) {
    if (!(this instanceof Deflate))
      return new Deflate(options);
    this.options = utils.assign({
      level: Z_DEFAULT_COMPRESSION,
      method: Z_DEFLATED,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: Z_DEFAULT_STRATEGY,
      to: ""
    }, options || {});
    var opt = this.options;
    if (opt.raw && opt.windowBits > 0) {
      opt.windowBits = -opt.windowBits;
    } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
      opt.windowBits += 16;
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.chunks = [];
    this.strm = new ZStream;
    this.strm.avail_out = 0;
    var status = zlib_deflate.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);
    if (status !== Z_OK) {
      throw new Error(msg[status]);
    }
    if (opt.header) {
      zlib_deflate.deflateSetHeader(this.strm, opt.header);
    }
    if (opt.dictionary) {
      var dict;
      if (typeof opt.dictionary === "string") {
        dict = strings.string2buf(opt.dictionary);
      } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
        dict = new Uint8Array(opt.dictionary);
      } else {
        dict = opt.dictionary;
      }
      status = zlib_deflate.deflateSetDictionary(this.strm, dict);
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      this._dict_set = true;
    }
  }
  Deflate.prototype.push = function(data, mode) {
    var strm = this.strm;
    var chunkSize = this.options.chunkSize;
    var status, _mode;
    if (this.ended) {
      return false;
    }
    _mode = mode === ~~mode ? mode : mode === true ? Z_FINISH : Z_NO_FLUSH;
    if (typeof data === "string") {
      strm.input = strings.string2buf(data);
    } else if (toString.call(data) === "[object ArrayBuffer]") {
      strm.input = new Uint8Array(data);
    } else {
      strm.input = data;
    }
    strm.next_in = 0;
    strm.avail_in = strm.input.length;
    do {
      if (strm.avail_out === 0) {
        strm.output = new utils.Buf8(chunkSize);
        strm.next_out = 0;
        strm.avail_out = chunkSize;
      }
      status = zlib_deflate.deflate(strm, _mode);
      if (status !== Z_STREAM_END && status !== Z_OK) {
        this.onEnd(status);
        this.ended = true;
        return false;
      }
      if (strm.avail_out === 0 || strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH)) {
        if (this.options.to === "string") {
          this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
        } else {
          this.onData(utils.shrinkBuf(strm.output, strm.next_out));
        }
      }
    } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);
    if (_mode === Z_FINISH) {
      status = zlib_deflate.deflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === Z_OK;
    }
    if (_mode === Z_SYNC_FLUSH) {
      this.onEnd(Z_OK);
      strm.avail_out = 0;
      return true;
    }
    return true;
  };
  Deflate.prototype.onData = function(chunk) {
    this.chunks.push(chunk);
  };
  Deflate.prototype.onEnd = function(status) {
    if (status === Z_OK) {
      if (this.options.to === "string") {
        this.result = this.chunks.join("");
      } else {
        this.result = utils.flattenChunks(this.chunks);
      }
    }
    this.chunks = [];
    this.err = status;
    this.msg = this.strm.msg;
  };
  function deflate(input, options) {
    var deflator = new Deflate(options);
    deflator.push(input, true);
    if (deflator.err) {
      throw deflator.msg || msg[deflator.err];
    }
    return deflator.result;
  }
  function deflateRaw(input, options) {
    options = options || {};
    options.raw = true;
    return deflate(input, options);
  }
  function gzip(input, options) {
    options = options || {};
    options.gzip = true;
    return deflate(input, options);
  }
  exports.Deflate = Deflate;
  exports.deflate = deflate;
  exports.deflateRaw = deflateRaw;
  exports.gzip = gzip;
});

// node_modules/pako/lib/zlib/inffast.js
var require_inffast = __commonJS((exports, module) => {
  var BAD = 30;
  var TYPE = 12;
  module.exports = function inflate_fast(strm, start) {
    var state;
    var _in;
    var last;
    var _out;
    var beg;
    var end;
    var dmax;
    var wsize;
    var whave;
    var wnext;
    var s_window;
    var hold;
    var bits;
    var lcode;
    var dcode;
    var lmask;
    var dmask;
    var here;
    var op;
    var len;
    var dist;
    var from;
    var from_source;
    var input, output;
    state = strm.state;
    _in = strm.next_in;
    input = strm.input;
    last = _in + (strm.avail_in - 5);
    _out = strm.next_out;
    output = strm.output;
    beg = _out - (start - strm.avail_out);
    end = _out + (strm.avail_out - 257);
    dmax = state.dmax;
    wsize = state.wsize;
    whave = state.whave;
    wnext = state.wnext;
    s_window = state.window;
    hold = state.hold;
    bits = state.bits;
    lcode = state.lencode;
    dcode = state.distcode;
    lmask = (1 << state.lenbits) - 1;
    dmask = (1 << state.distbits) - 1;
    top:
      do {
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = lcode[hold & lmask];
        dolen:
          for (;; ) {
            op = here >>> 24;
            hold >>>= op;
            bits -= op;
            op = here >>> 16 & 255;
            if (op === 0) {
              output[_out++] = here & 65535;
            } else if (op & 16) {
              len = here & 65535;
              op &= 15;
              if (op) {
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                len += hold & (1 << op) - 1;
                hold >>>= op;
                bits -= op;
              }
              if (bits < 15) {
                hold += input[_in++] << bits;
                bits += 8;
                hold += input[_in++] << bits;
                bits += 8;
              }
              here = dcode[hold & dmask];
              dodist:
                for (;; ) {
                  op = here >>> 24;
                  hold >>>= op;
                  bits -= op;
                  op = here >>> 16 & 255;
                  if (op & 16) {
                    dist = here & 65535;
                    op &= 15;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                      }
                    }
                    dist += hold & (1 << op) - 1;
                    if (dist > dmax) {
                      strm.msg = "invalid distance too far back";
                      state.mode = BAD;
                      break top;
                    }
                    hold >>>= op;
                    bits -= op;
                    op = _out - beg;
                    if (dist > op) {
                      op = dist - op;
                      if (op > whave) {
                        if (state.sane) {
                          strm.msg = "invalid distance too far back";
                          state.mode = BAD;
                          break top;
                        }
                      }
                      from = 0;
                      from_source = s_window;
                      if (wnext === 0) {
                        from += wsize - op;
                        if (op < len) {
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      } else if (wnext < op) {
                        from += wsize + wnext - op;
                        op -= wnext;
                        if (op < len) {
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = 0;
                          if (wnext < len) {
                            op = wnext;
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                      } else {
                        from += wnext - op;
                        if (op < len) {
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                      while (len > 2) {
                        output[_out++] = from_source[from++];
                        output[_out++] = from_source[from++];
                        output[_out++] = from_source[from++];
                        len -= 3;
                      }
                      if (len) {
                        output[_out++] = from_source[from++];
                        if (len > 1) {
                          output[_out++] = from_source[from++];
                        }
                      }
                    } else {
                      from = _out - dist;
                      do {
                        output[_out++] = output[from++];
                        output[_out++] = output[from++];
                        output[_out++] = output[from++];
                        len -= 3;
                      } while (len > 2);
                      if (len) {
                        output[_out++] = output[from++];
                        if (len > 1) {
                          output[_out++] = output[from++];
                        }
                      }
                    }
                  } else if ((op & 64) === 0) {
                    here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                    continue dodist;
                  } else {
                    strm.msg = "invalid distance code";
                    state.mode = BAD;
                    break top;
                  }
                  break;
                }
            } else if ((op & 64) === 0) {
              here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
              continue dolen;
            } else if (op & 32) {
              state.mode = TYPE;
              break top;
            } else {
              strm.msg = "invalid literal/length code";
              state.mode = BAD;
              break top;
            }
            break;
          }
      } while (_in < last && _out < end);
    len = bits >> 3;
    _in -= len;
    bits -= len << 3;
    hold &= (1 << bits) - 1;
    strm.next_in = _in;
    strm.next_out = _out;
    strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
    strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
    state.hold = hold;
    state.bits = bits;
    return;
  };
});

// node_modules/pako/lib/zlib/inftrees.js
var require_inftrees = __commonJS((exports, module) => {
  var utils = require_common();
  var MAXBITS = 15;
  var ENOUGH_LENS = 852;
  var ENOUGH_DISTS = 592;
  var CODES = 0;
  var LENS = 1;
  var DISTS = 2;
  var lbase = [
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0
  ];
  var lext = [
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78
  ];
  var dbase = [
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0
  ];
  var dext = [
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64
  ];
  module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
    var bits = opts.bits;
    var len = 0;
    var sym = 0;
    var min = 0, max = 0;
    var root = 0;
    var curr = 0;
    var drop = 0;
    var left = 0;
    var used = 0;
    var huff = 0;
    var incr;
    var fill;
    var low;
    var mask;
    var next;
    var base = null;
    var base_index = 0;
    var end;
    var count = new utils.Buf16(MAXBITS + 1);
    var offs = new utils.Buf16(MAXBITS + 1);
    var extra = null;
    var extra_index = 0;
    var here_bits, here_op, here_val;
    for (len = 0;len <= MAXBITS; len++) {
      count[len] = 0;
    }
    for (sym = 0;sym < codes; sym++) {
      count[lens[lens_index + sym]]++;
    }
    root = bits;
    for (max = MAXBITS;max >= 1; max--) {
      if (count[max] !== 0) {
        break;
      }
    }
    if (root > max) {
      root = max;
    }
    if (max === 0) {
      table[table_index++] = 1 << 24 | 64 << 16 | 0;
      table[table_index++] = 1 << 24 | 64 << 16 | 0;
      opts.bits = 1;
      return 0;
    }
    for (min = 1;min < max; min++) {
      if (count[min] !== 0) {
        break;
      }
    }
    if (root < min) {
      root = min;
    }
    left = 1;
    for (len = 1;len <= MAXBITS; len++) {
      left <<= 1;
      left -= count[len];
      if (left < 0) {
        return -1;
      }
    }
    if (left > 0 && (type === CODES || max !== 1)) {
      return -1;
    }
    offs[1] = 0;
    for (len = 1;len < MAXBITS; len++) {
      offs[len + 1] = offs[len] + count[len];
    }
    for (sym = 0;sym < codes; sym++) {
      if (lens[lens_index + sym] !== 0) {
        work[offs[lens[lens_index + sym]]++] = sym;
      }
    }
    if (type === CODES) {
      base = extra = work;
      end = 19;
    } else if (type === LENS) {
      base = lbase;
      base_index -= 257;
      extra = lext;
      extra_index -= 257;
      end = 256;
    } else {
      base = dbase;
      extra = dext;
      end = -1;
    }
    huff = 0;
    sym = 0;
    len = min;
    next = table_index;
    curr = root;
    drop = 0;
    low = -1;
    used = 1 << root;
    mask = used - 1;
    if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
      return 1;
    }
    for (;; ) {
      here_bits = len - drop;
      if (work[sym] < end) {
        here_op = 0;
        here_val = work[sym];
      } else if (work[sym] > end) {
        here_op = extra[extra_index + work[sym]];
        here_val = base[base_index + work[sym]];
      } else {
        here_op = 32 + 64;
        here_val = 0;
      }
      incr = 1 << len - drop;
      fill = 1 << curr;
      min = fill;
      do {
        fill -= incr;
        table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
      } while (fill !== 0);
      incr = 1 << len - 1;
      while (huff & incr) {
        incr >>= 1;
      }
      if (incr !== 0) {
        huff &= incr - 1;
        huff += incr;
      } else {
        huff = 0;
      }
      sym++;
      if (--count[len] === 0) {
        if (len === max) {
          break;
        }
        len = lens[lens_index + work[sym]];
      }
      if (len > root && (huff & mask) !== low) {
        if (drop === 0) {
          drop = root;
        }
        next += min;
        curr = len - drop;
        left = 1 << curr;
        while (curr + drop < max) {
          left -= count[curr + drop];
          if (left <= 0) {
            break;
          }
          curr++;
          left <<= 1;
        }
        used += 1 << curr;
        if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
          return 1;
        }
        low = huff & mask;
        table[low] = root << 24 | curr << 16 | next - table_index | 0;
      }
    }
    if (huff !== 0) {
      table[next + huff] = len - drop << 24 | 64 << 16 | 0;
    }
    opts.bits = root;
    return 0;
  };
});

// node_modules/pako/lib/zlib/inflate.js
var require_inflate = __commonJS((exports) => {
  var utils = require_common();
  var adler32 = require_adler32();
  var crc32 = require_crc322();
  var inflate_fast = require_inffast();
  var inflate_table = require_inftrees();
  var CODES = 0;
  var LENS = 1;
  var DISTS = 2;
  var Z_FINISH = 4;
  var Z_BLOCK = 5;
  var Z_TREES = 6;
  var Z_OK = 0;
  var Z_STREAM_END = 1;
  var Z_NEED_DICT = 2;
  var Z_STREAM_ERROR = -2;
  var Z_DATA_ERROR = -3;
  var Z_MEM_ERROR = -4;
  var Z_BUF_ERROR = -5;
  var Z_DEFLATED = 8;
  var HEAD = 1;
  var FLAGS = 2;
  var TIME = 3;
  var OS = 4;
  var EXLEN = 5;
  var EXTRA = 6;
  var NAME = 7;
  var COMMENT = 8;
  var HCRC = 9;
  var DICTID = 10;
  var DICT = 11;
  var TYPE = 12;
  var TYPEDO = 13;
  var STORED = 14;
  var COPY_ = 15;
  var COPY = 16;
  var TABLE = 17;
  var LENLENS = 18;
  var CODELENS = 19;
  var LEN_ = 20;
  var LEN = 21;
  var LENEXT = 22;
  var DIST = 23;
  var DISTEXT = 24;
  var MATCH = 25;
  var LIT = 26;
  var CHECK = 27;
  var LENGTH = 28;
  var DONE = 29;
  var BAD = 30;
  var MEM = 31;
  var SYNC = 32;
  var ENOUGH_LENS = 852;
  var ENOUGH_DISTS = 592;
  var MAX_WBITS = 15;
  var DEF_WBITS = MAX_WBITS;
  function zswap32(q) {
    return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
  }
  function InflateState() {
    this.mode = 0;
    this.last = false;
    this.wrap = 0;
    this.havedict = false;
    this.flags = 0;
    this.dmax = 0;
    this.check = 0;
    this.total = 0;
    this.head = null;
    this.wbits = 0;
    this.wsize = 0;
    this.whave = 0;
    this.wnext = 0;
    this.window = null;
    this.hold = 0;
    this.bits = 0;
    this.length = 0;
    this.offset = 0;
    this.extra = 0;
    this.lencode = null;
    this.distcode = null;
    this.lenbits = 0;
    this.distbits = 0;
    this.ncode = 0;
    this.nlen = 0;
    this.ndist = 0;
    this.have = 0;
    this.next = null;
    this.lens = new utils.Buf16(320);
    this.work = new utils.Buf16(288);
    this.lendyn = null;
    this.distdyn = null;
    this.sane = 0;
    this.back = 0;
    this.was = 0;
  }
  function inflateResetKeep(strm) {
    var state;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    state = strm.state;
    strm.total_in = strm.total_out = state.total = 0;
    strm.msg = "";
    if (state.wrap) {
      strm.adler = state.wrap & 1;
    }
    state.mode = HEAD;
    state.last = 0;
    state.havedict = 0;
    state.dmax = 32768;
    state.head = null;
    state.hold = 0;
    state.bits = 0;
    state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
    state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);
    state.sane = 1;
    state.back = -1;
    return Z_OK;
  }
  function inflateReset(strm) {
    var state;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    state = strm.state;
    state.wsize = 0;
    state.whave = 0;
    state.wnext = 0;
    return inflateResetKeep(strm);
  }
  function inflateReset2(strm, windowBits) {
    var wrap;
    var state;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    state = strm.state;
    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else {
      wrap = (windowBits >> 4) + 1;
      if (windowBits < 48) {
        windowBits &= 15;
      }
    }
    if (windowBits && (windowBits < 8 || windowBits > 15)) {
      return Z_STREAM_ERROR;
    }
    if (state.window !== null && state.wbits !== windowBits) {
      state.window = null;
    }
    state.wrap = wrap;
    state.wbits = windowBits;
    return inflateReset(strm);
  }
  function inflateInit2(strm, windowBits) {
    var ret;
    var state;
    if (!strm) {
      return Z_STREAM_ERROR;
    }
    state = new InflateState;
    strm.state = state;
    state.window = null;
    ret = inflateReset2(strm, windowBits);
    if (ret !== Z_OK) {
      strm.state = null;
    }
    return ret;
  }
  function inflateInit(strm) {
    return inflateInit2(strm, DEF_WBITS);
  }
  var virgin = true;
  var lenfix;
  var distfix;
  function fixedtables(state) {
    if (virgin) {
      var sym;
      lenfix = new utils.Buf32(512);
      distfix = new utils.Buf32(32);
      sym = 0;
      while (sym < 144) {
        state.lens[sym++] = 8;
      }
      while (sym < 256) {
        state.lens[sym++] = 9;
      }
      while (sym < 280) {
        state.lens[sym++] = 7;
      }
      while (sym < 288) {
        state.lens[sym++] = 8;
      }
      inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
      sym = 0;
      while (sym < 32) {
        state.lens[sym++] = 5;
      }
      inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
      virgin = false;
    }
    state.lencode = lenfix;
    state.lenbits = 9;
    state.distcode = distfix;
    state.distbits = 5;
  }
  function updatewindow(strm, src, end, copy) {
    var dist;
    var state = strm.state;
    if (state.window === null) {
      state.wsize = 1 << state.wbits;
      state.wnext = 0;
      state.whave = 0;
      state.window = new utils.Buf8(state.wsize);
    }
    if (copy >= state.wsize) {
      utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
      state.wnext = 0;
      state.whave = state.wsize;
    } else {
      dist = state.wsize - state.wnext;
      if (dist > copy) {
        dist = copy;
      }
      utils.arraySet(state.window, src, end - copy, dist, state.wnext);
      copy -= dist;
      if (copy) {
        utils.arraySet(state.window, src, end - copy, copy, 0);
        state.wnext = copy;
        state.whave = state.wsize;
      } else {
        state.wnext += dist;
        if (state.wnext === state.wsize) {
          state.wnext = 0;
        }
        if (state.whave < state.wsize) {
          state.whave += dist;
        }
      }
    }
    return 0;
  }
  function inflate(strm, flush) {
    var state;
    var input, output;
    var next;
    var put;
    var have, left;
    var hold;
    var bits;
    var _in, _out;
    var copy;
    var from;
    var from_source;
    var here = 0;
    var here_bits, here_op, here_val;
    var last_bits, last_op, last_val;
    var len;
    var ret;
    var hbuf = new utils.Buf8(4);
    var opts;
    var n;
    var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
      return Z_STREAM_ERROR;
    }
    state = strm.state;
    if (state.mode === TYPE) {
      state.mode = TYPEDO;
    }
    put = strm.next_out;
    output = strm.output;
    left = strm.avail_out;
    next = strm.next_in;
    input = strm.input;
    have = strm.avail_in;
    hold = state.hold;
    bits = state.bits;
    _in = have;
    _out = left;
    ret = Z_OK;
    inf_leave:
      for (;; ) {
        switch (state.mode) {
          case HEAD:
            if (state.wrap === 0) {
              state.mode = TYPEDO;
              break;
            }
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 2 && hold === 35615) {
              state.check = 0;
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
              hold = 0;
              bits = 0;
              state.mode = FLAGS;
              break;
            }
            state.flags = 0;
            if (state.head) {
              state.head.done = false;
            }
            if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
              strm.msg = "incorrect header check";
              state.mode = BAD;
              break;
            }
            if ((hold & 15) !== Z_DEFLATED) {
              strm.msg = "unknown compression method";
              state.mode = BAD;
              break;
            }
            hold >>>= 4;
            bits -= 4;
            len = (hold & 15) + 8;
            if (state.wbits === 0) {
              state.wbits = len;
            } else if (len > state.wbits) {
              strm.msg = "invalid window size";
              state.mode = BAD;
              break;
            }
            state.dmax = 1 << len;
            strm.adler = state.check = 1;
            state.mode = hold & 512 ? DICTID : TYPE;
            hold = 0;
            bits = 0;
            break;
          case FLAGS:
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.flags = hold;
            if ((state.flags & 255) !== Z_DEFLATED) {
              strm.msg = "unknown compression method";
              state.mode = BAD;
              break;
            }
            if (state.flags & 57344) {
              strm.msg = "unknown header flags set";
              state.mode = BAD;
              break;
            }
            if (state.head) {
              state.head.text = hold >> 8 & 1;
            }
            if (state.flags & 512) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = TIME;
          case TIME:
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.head) {
              state.head.time = hold;
            }
            if (state.flags & 512) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              hbuf[2] = hold >>> 16 & 255;
              hbuf[3] = hold >>> 24 & 255;
              state.check = crc32(state.check, hbuf, 4, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = OS;
          case OS:
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.head) {
              state.head.xflags = hold & 255;
              state.head.os = hold >> 8;
            }
            if (state.flags & 512) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
            state.mode = EXLEN;
          case EXLEN:
            if (state.flags & 1024) {
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.length = hold;
              if (state.head) {
                state.head.extra_len = hold;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
            } else if (state.head) {
              state.head.extra = null;
            }
            state.mode = EXTRA;
          case EXTRA:
            if (state.flags & 1024) {
              copy = state.length;
              if (copy > have) {
                copy = have;
              }
              if (copy) {
                if (state.head) {
                  len = state.head.extra_len - state.length;
                  if (!state.head.extra) {
                    state.head.extra = new Array(state.head.extra_len);
                  }
                  utils.arraySet(state.head.extra, input, next, copy, len);
                }
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                state.length -= copy;
              }
              if (state.length) {
                break inf_leave;
              }
            }
            state.length = 0;
            state.mode = NAME;
          case NAME:
            if (state.flags & 2048) {
              if (have === 0) {
                break inf_leave;
              }
              copy = 0;
              do {
                len = input[next + copy++];
                if (state.head && len && state.length < 65536) {
                  state.head.name += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 512) {
                state.check = crc32(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) {
                break inf_leave;
              }
            } else if (state.head) {
              state.head.name = null;
            }
            state.length = 0;
            state.mode = COMMENT;
          case COMMENT:
            if (state.flags & 4096) {
              if (have === 0) {
                break inf_leave;
              }
              copy = 0;
              do {
                len = input[next + copy++];
                if (state.head && len && state.length < 65536) {
                  state.head.comment += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 512) {
                state.check = crc32(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) {
                break inf_leave;
              }
            } else if (state.head) {
              state.head.comment = null;
            }
            state.mode = HCRC;
          case HCRC:
            if (state.flags & 512) {
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (hold !== (state.check & 65535)) {
                strm.msg = "header crc mismatch";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            if (state.head) {
              state.head.hcrc = state.flags >> 9 & 1;
              state.head.done = true;
            }
            strm.adler = state.check = 0;
            state.mode = TYPE;
            break;
          case DICTID:
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            strm.adler = state.check = zswap32(hold);
            hold = 0;
            bits = 0;
            state.mode = DICT;
          case DICT:
            if (state.havedict === 0) {
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              return Z_NEED_DICT;
            }
            strm.adler = state.check = 1;
            state.mode = TYPE;
          case TYPE:
            if (flush === Z_BLOCK || flush === Z_TREES) {
              break inf_leave;
            }
          case TYPEDO:
            if (state.last) {
              hold >>>= bits & 7;
              bits -= bits & 7;
              state.mode = CHECK;
              break;
            }
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.last = hold & 1;
            hold >>>= 1;
            bits -= 1;
            switch (hold & 3) {
              case 0:
                state.mode = STORED;
                break;
              case 1:
                fixedtables(state);
                state.mode = LEN_;
                if (flush === Z_TREES) {
                  hold >>>= 2;
                  bits -= 2;
                  break inf_leave;
                }
                break;
              case 2:
                state.mode = TABLE;
                break;
              case 3:
                strm.msg = "invalid block type";
                state.mode = BAD;
            }
            hold >>>= 2;
            bits -= 2;
            break;
          case STORED:
            hold >>>= bits & 7;
            bits -= bits & 7;
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
              strm.msg = "invalid stored block lengths";
              state.mode = BAD;
              break;
            }
            state.length = hold & 65535;
            hold = 0;
            bits = 0;
            state.mode = COPY_;
            if (flush === Z_TREES) {
              break inf_leave;
            }
          case COPY_:
            state.mode = COPY;
          case COPY:
            copy = state.length;
            if (copy) {
              if (copy > have) {
                copy = have;
              }
              if (copy > left) {
                copy = left;
              }
              if (copy === 0) {
                break inf_leave;
              }
              utils.arraySet(output, input, next, copy, put);
              have -= copy;
              next += copy;
              left -= copy;
              put += copy;
              state.length -= copy;
              break;
            }
            state.mode = TYPE;
            break;
          case TABLE:
            while (bits < 14) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.nlen = (hold & 31) + 257;
            hold >>>= 5;
            bits -= 5;
            state.ndist = (hold & 31) + 1;
            hold >>>= 5;
            bits -= 5;
            state.ncode = (hold & 15) + 4;
            hold >>>= 4;
            bits -= 4;
            if (state.nlen > 286 || state.ndist > 30) {
              strm.msg = "too many length or distance symbols";
              state.mode = BAD;
              break;
            }
            state.have = 0;
            state.mode = LENLENS;
          case LENLENS:
            while (state.have < state.ncode) {
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.lens[order[state.have++]] = hold & 7;
              hold >>>= 3;
              bits -= 3;
            }
            while (state.have < 19) {
              state.lens[order[state.have++]] = 0;
            }
            state.lencode = state.lendyn;
            state.lenbits = 7;
            opts = { bits: state.lenbits };
            ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;
            if (ret) {
              strm.msg = "invalid code lengths set";
              state.mode = BAD;
              break;
            }
            state.have = 0;
            state.mode = CODELENS;
          case CODELENS:
            while (state.have < state.nlen + state.ndist) {
              for (;; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_val < 16) {
                hold >>>= here_bits;
                bits -= here_bits;
                state.lens[state.have++] = here_val;
              } else {
                if (here_val === 16) {
                  n = here_bits + 2;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  if (state.have === 0) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  len = state.lens[state.have - 1];
                  copy = 3 + (hold & 3);
                  hold >>>= 2;
                  bits -= 2;
                } else if (here_val === 17) {
                  n = here_bits + 3;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  len = 0;
                  copy = 3 + (hold & 7);
                  hold >>>= 3;
                  bits -= 3;
                } else {
                  n = here_bits + 7;
                  while (bits < n) {
                    if (have === 0) {
                      break inf_leave;
                    }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  hold >>>= here_bits;
                  bits -= here_bits;
                  len = 0;
                  copy = 11 + (hold & 127);
                  hold >>>= 7;
                  bits -= 7;
                }
                if (state.have + copy > state.nlen + state.ndist) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                while (copy--) {
                  state.lens[state.have++] = len;
                }
              }
            }
            if (state.mode === BAD) {
              break;
            }
            if (state.lens[256] === 0) {
              strm.msg = "invalid code -- missing end-of-block";
              state.mode = BAD;
              break;
            }
            state.lenbits = 9;
            opts = { bits: state.lenbits };
            ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;
            if (ret) {
              strm.msg = "invalid literal/lengths set";
              state.mode = BAD;
              break;
            }
            state.distbits = 6;
            state.distcode = state.distdyn;
            opts = { bits: state.distbits };
            ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
            state.distbits = opts.bits;
            if (ret) {
              strm.msg = "invalid distances set";
              state.mode = BAD;
              break;
            }
            state.mode = LEN_;
            if (flush === Z_TREES) {
              break inf_leave;
            }
          case LEN_:
            state.mode = LEN;
          case LEN:
            if (have >= 6 && left >= 258) {
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              inflate_fast(strm, _out);
              put = strm.next_out;
              output = strm.output;
              left = strm.avail_out;
              next = strm.next_in;
              input = strm.input;
              have = strm.avail_in;
              hold = state.hold;
              bits = state.bits;
              if (state.mode === TYPE) {
                state.back = -1;
              }
              break;
            }
            state.back = 0;
            for (;; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_op && (here_op & 240) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;; ) {
                here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (last_bits + here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= last_bits;
              bits -= last_bits;
              state.back += last_bits;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            state.back += here_bits;
            state.length = here_val;
            if (here_op === 0) {
              state.mode = LIT;
              break;
            }
            if (here_op & 32) {
              state.back = -1;
              state.mode = TYPE;
              break;
            }
            if (here_op & 64) {
              strm.msg = "invalid literal/length code";
              state.mode = BAD;
              break;
            }
            state.extra = here_op & 15;
            state.mode = LENEXT;
          case LENEXT:
            if (state.extra) {
              n = state.extra;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.length += hold & (1 << state.extra) - 1;
              hold >>>= state.extra;
              bits -= state.extra;
              state.back += state.extra;
            }
            state.was = state.length;
            state.mode = DIST;
          case DIST:
            for (;; ) {
              here = state.distcode[hold & (1 << state.distbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if ((here_op & 240) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;; ) {
                here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (last_bits + here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= last_bits;
              bits -= last_bits;
              state.back += last_bits;
            }
            hold >>>= here_bits;
            bits -= here_bits;
            state.back += here_bits;
            if (here_op & 64) {
              strm.msg = "invalid distance code";
              state.mode = BAD;
              break;
            }
            state.offset = here_val;
            state.extra = here_op & 15;
            state.mode = DISTEXT;
          case DISTEXT:
            if (state.extra) {
              n = state.extra;
              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.offset += hold & (1 << state.extra) - 1;
              hold >>>= state.extra;
              bits -= state.extra;
              state.back += state.extra;
            }
            if (state.offset > state.dmax) {
              strm.msg = "invalid distance too far back";
              state.mode = BAD;
              break;
            }
            state.mode = MATCH;
          case MATCH:
            if (left === 0) {
              break inf_leave;
            }
            copy = _out - left;
            if (state.offset > copy) {
              copy = state.offset - copy;
              if (copy > state.whave) {
                if (state.sane) {
                  strm.msg = "invalid distance too far back";
                  state.mode = BAD;
                  break;
                }
              }
              if (copy > state.wnext) {
                copy -= state.wnext;
                from = state.wsize - copy;
              } else {
                from = state.wnext - copy;
              }
              if (copy > state.length) {
                copy = state.length;
              }
              from_source = state.window;
            } else {
              from_source = output;
              from = put - state.offset;
              copy = state.length;
            }
            if (copy > left) {
              copy = left;
            }
            left -= copy;
            state.length -= copy;
            do {
              output[put++] = from_source[from++];
            } while (--copy);
            if (state.length === 0) {
              state.mode = LEN;
            }
            break;
          case LIT:
            if (left === 0) {
              break inf_leave;
            }
            output[put++] = state.length;
            left--;
            state.mode = LEN;
            break;
          case CHECK:
            if (state.wrap) {
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold |= input[next++] << bits;
                bits += 8;
              }
              _out -= left;
              strm.total_out += _out;
              state.total += _out;
              if (_out) {
                strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
              }
              _out = left;
              if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                strm.msg = "incorrect data check";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            state.mode = LENGTH;
          case LENGTH:
            if (state.wrap && state.flags) {
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (hold !== (state.total & 4294967295)) {
                strm.msg = "incorrect length check";
                state.mode = BAD;
                break;
              }
              hold = 0;
              bits = 0;
            }
            state.mode = DONE;
          case DONE:
            ret = Z_STREAM_END;
            break inf_leave;
          case BAD:
            ret = Z_DATA_ERROR;
            break inf_leave;
          case MEM:
            return Z_MEM_ERROR;
          case SYNC:
          default:
            return Z_STREAM_ERROR;
        }
      }
    strm.next_out = put;
    strm.avail_out = left;
    strm.next_in = next;
    strm.avail_in = have;
    state.hold = hold;
    state.bits = bits;
    if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
      if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
    }
    _in -= strm.avail_in;
    _out -= strm.avail_out;
    strm.total_in += _in;
    strm.total_out += _out;
    state.total += _out;
    if (state.wrap && _out) {
      strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
    }
    strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
    if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
      ret = Z_BUF_ERROR;
    }
    return ret;
  }
  function inflateEnd(strm) {
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    var state = strm.state;
    if (state.window) {
      state.window = null;
    }
    strm.state = null;
    return Z_OK;
  }
  function inflateGetHeader(strm, head) {
    var state;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    state = strm.state;
    if ((state.wrap & 2) === 0) {
      return Z_STREAM_ERROR;
    }
    state.head = head;
    head.done = false;
    return Z_OK;
  }
  function inflateSetDictionary(strm, dictionary) {
    var dictLength = dictionary.length;
    var state;
    var dictid;
    var ret;
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }
    state = strm.state;
    if (state.wrap !== 0 && state.mode !== DICT) {
      return Z_STREAM_ERROR;
    }
    if (state.mode === DICT) {
      dictid = 1;
      dictid = adler32(dictid, dictionary, dictLength, 0);
      if (dictid !== state.check) {
        return Z_DATA_ERROR;
      }
    }
    ret = updatewindow(strm, dictionary, dictLength, dictLength);
    if (ret) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
    state.havedict = 1;
    return Z_OK;
  }
  exports.inflateReset = inflateReset;
  exports.inflateReset2 = inflateReset2;
  exports.inflateResetKeep = inflateResetKeep;
  exports.inflateInit = inflateInit;
  exports.inflateInit2 = inflateInit2;
  exports.inflate = inflate;
  exports.inflateEnd = inflateEnd;
  exports.inflateGetHeader = inflateGetHeader;
  exports.inflateSetDictionary = inflateSetDictionary;
  exports.inflateInfo = "pako inflate (from Nodeca project)";
});

// node_modules/pako/lib/zlib/constants.js
var require_constants = __commonJS((exports, module) => {
  module.exports = {
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    Z_BUF_ERROR: -5,
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    Z_BINARY: 0,
    Z_TEXT: 1,
    Z_UNKNOWN: 2,
    Z_DEFLATED: 8
  };
});

// node_modules/pako/lib/zlib/gzheader.js
var require_gzheader = __commonJS((exports, module) => {
  function GZheader() {
    this.text = 0;
    this.time = 0;
    this.xflags = 0;
    this.os = 0;
    this.extra = null;
    this.extra_len = 0;
    this.name = "";
    this.comment = "";
    this.hcrc = 0;
    this.done = false;
  }
  module.exports = GZheader;
});

// node_modules/pako/lib/inflate.js
var require_inflate2 = __commonJS((exports) => {
  var zlib_inflate = require_inflate();
  var utils = require_common();
  var strings = require_strings();
  var c = require_constants();
  var msg = require_messages();
  var ZStream = require_zstream();
  var GZheader = require_gzheader();
  var toString = Object.prototype.toString;
  function Inflate(options) {
    if (!(this instanceof Inflate))
      return new Inflate(options);
    this.options = utils.assign({
      chunkSize: 16384,
      windowBits: 0,
      to: ""
    }, options || {});
    var opt = this.options;
    if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
      opt.windowBits = -opt.windowBits;
      if (opt.windowBits === 0) {
        opt.windowBits = -15;
      }
    }
    if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
      opt.windowBits += 32;
    }
    if (opt.windowBits > 15 && opt.windowBits < 48) {
      if ((opt.windowBits & 15) === 0) {
        opt.windowBits |= 15;
      }
    }
    this.err = 0;
    this.msg = "";
    this.ended = false;
    this.chunks = [];
    this.strm = new ZStream;
    this.strm.avail_out = 0;
    var status = zlib_inflate.inflateInit2(this.strm, opt.windowBits);
    if (status !== c.Z_OK) {
      throw new Error(msg[status]);
    }
    this.header = new GZheader;
    zlib_inflate.inflateGetHeader(this.strm, this.header);
    if (opt.dictionary) {
      if (typeof opt.dictionary === "string") {
        opt.dictionary = strings.string2buf(opt.dictionary);
      } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
        opt.dictionary = new Uint8Array(opt.dictionary);
      }
      if (opt.raw) {
        status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
        if (status !== c.Z_OK) {
          throw new Error(msg[status]);
        }
      }
    }
  }
  Inflate.prototype.push = function(data, mode) {
    var strm = this.strm;
    var chunkSize = this.options.chunkSize;
    var dictionary = this.options.dictionary;
    var status, _mode;
    var next_out_utf8, tail, utf8str;
    var allowBufError = false;
    if (this.ended) {
      return false;
    }
    _mode = mode === ~~mode ? mode : mode === true ? c.Z_FINISH : c.Z_NO_FLUSH;
    if (typeof data === "string") {
      strm.input = strings.binstring2buf(data);
    } else if (toString.call(data) === "[object ArrayBuffer]") {
      strm.input = new Uint8Array(data);
    } else {
      strm.input = data;
    }
    strm.next_in = 0;
    strm.avail_in = strm.input.length;
    do {
      if (strm.avail_out === 0) {
        strm.output = new utils.Buf8(chunkSize);
        strm.next_out = 0;
        strm.avail_out = chunkSize;
      }
      status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);
      if (status === c.Z_NEED_DICT && dictionary) {
        status = zlib_inflate.inflateSetDictionary(this.strm, dictionary);
      }
      if (status === c.Z_BUF_ERROR && allowBufError === true) {
        status = c.Z_OK;
        allowBufError = false;
      }
      if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
        this.onEnd(status);
        this.ended = true;
        return false;
      }
      if (strm.next_out) {
        if (strm.avail_out === 0 || status === c.Z_STREAM_END || strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH)) {
          if (this.options.to === "string") {
            next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
            tail = strm.next_out - next_out_utf8;
            utf8str = strings.buf2string(strm.output, next_out_utf8);
            strm.next_out = tail;
            strm.avail_out = chunkSize - tail;
            if (tail) {
              utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0);
            }
            this.onData(utf8str);
          } else {
            this.onData(utils.shrinkBuf(strm.output, strm.next_out));
          }
        }
      }
      if (strm.avail_in === 0 && strm.avail_out === 0) {
        allowBufError = true;
      }
    } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);
    if (status === c.Z_STREAM_END) {
      _mode = c.Z_FINISH;
    }
    if (_mode === c.Z_FINISH) {
      status = zlib_inflate.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === c.Z_OK;
    }
    if (_mode === c.Z_SYNC_FLUSH) {
      this.onEnd(c.Z_OK);
      strm.avail_out = 0;
      return true;
    }
    return true;
  };
  Inflate.prototype.onData = function(chunk) {
    this.chunks.push(chunk);
  };
  Inflate.prototype.onEnd = function(status) {
    if (status === c.Z_OK) {
      if (this.options.to === "string") {
        this.result = this.chunks.join("");
      } else {
        this.result = utils.flattenChunks(this.chunks);
      }
    }
    this.chunks = [];
    this.err = status;
    this.msg = this.strm.msg;
  };
  function inflate(input, options) {
    var inflator = new Inflate(options);
    inflator.push(input, true);
    if (inflator.err) {
      throw inflator.msg || msg[inflator.err];
    }
    return inflator.result;
  }
  function inflateRaw(input, options) {
    options = options || {};
    options.raw = true;
    return inflate(input, options);
  }
  exports.Inflate = Inflate;
  exports.inflate = inflate;
  exports.inflateRaw = inflateRaw;
  exports.ungzip = inflate;
});

// node_modules/pako/index.js
var require_pako = __commonJS((exports, module) => {
  var assign = require_common().assign;
  var deflate = require_deflate2();
  var inflate = require_inflate2();
  var constants = require_constants();
  var pako = {};
  assign(pako, deflate, inflate, constants);
  module.exports = pako;
});

// node_modules/pify/index.js
var require_pify = __commonJS((exports, module) => {
  var processFn = (fn, options) => function(...args) {
    const P = options.promiseModule;
    return new P((resolve, reject) => {
      if (options.multiArgs) {
        args.push((...result) => {
          if (options.errorFirst) {
            if (result[0]) {
              reject(result);
            } else {
              result.shift();
              resolve(result);
            }
          } else {
            resolve(result);
          }
        });
      } else if (options.errorFirst) {
        args.push((error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      } else {
        args.push(resolve);
      }
      fn.apply(this, args);
    });
  };
  module.exports = (input, options) => {
    options = Object.assign({
      exclude: [/.+(Sync|Stream)$/],
      errorFirst: true,
      promiseModule: Promise
    }, options);
    const objType = typeof input;
    if (!(input !== null && (objType === "object" || objType === "function"))) {
      throw new TypeError(`Expected \`input\` to be a \`Function\` or \`Object\`, got \`${input === null ? "null" : objType}\``);
    }
    const filter = (key) => {
      const match = (pattern) => typeof pattern === "string" ? key === pattern : pattern.test(key);
      return options.include ? options.include.some(match) : !options.exclude.some(match);
    };
    let ret;
    if (objType === "function") {
      ret = function(...args) {
        return options.excludeMain ? input(...args) : processFn(input, options).apply(this, args);
      };
    } else {
      ret = Object.create(Object.getPrototypeOf(input));
    }
    for (const key in input) {
      const property = input[key];
      ret[key] = typeof property === "function" && filter(key) ? processFn(property, options) : property;
    }
    return ret;
  };
});

// node_modules/ignore/index.js
var require_ignore = __commonJS((exports, module) => {
  function makeArray(subject) {
    return Array.isArray(subject) ? subject : [subject];
  }
  var EMPTY = "";
  var SPACE = " ";
  var ESCAPE = "\\";
  var REGEX_TEST_BLANK_LINE = /^\s+$/;
  var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
  var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
  var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
  var REGEX_SPLITALL_CRLF = /\r?\n/g;
  var REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/;
  var SLASH = "/";
  var TMP_KEY_IGNORE = "node-ignore";
  if (typeof Symbol !== "undefined") {
    TMP_KEY_IGNORE = Symbol.for("node-ignore");
  }
  var KEY_IGNORE = TMP_KEY_IGNORE;
  var define2 = (object, key, value) => Object.defineProperty(object, key, { value });
  var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
  var RETURN_FALSE = () => false;
  var sanitizeRange = (range) => range.replace(REGEX_REGEXP_RANGE, (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY);
  var cleanRangeBackSlash = (slashes) => {
    const { length } = slashes;
    return slashes.slice(0, length - length % 2);
  };
  var REPLACERS = [
    [
      /^\uFEFF/,
      () => EMPTY
    ],
    [
      /((?:\\\\)*?)(\\?\s+)$/,
      (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)
    ],
    [
      /(\\+?)\s/g,
      (_, m1) => {
        const { length } = m1;
        return m1.slice(0, length - length % 2) + SPACE;
      }
    ],
    [
      /[\\$.|*+(){^]/g,
      (match) => `\\${match}`
    ],
    [
      /(?!\\)\?/g,
      () => "[^/]"
    ],
    [
      /^\//,
      () => "^"
    ],
    [
      /\//g,
      () => "\\/"
    ],
    [
      /^\^*\\\*\\\*\\\//,
      () => "^(?:.*\\/)?"
    ],
    [
      /^(?=[^^])/,
      function startingReplacer() {
        return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
      }
    ],
    [
      /\\\/\\\*\\\*(?=\\\/|$)/g,
      (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
    ],
    [
      /(^|[^\\]+)(\\\*)+(?=.+)/g,
      (_, p1, p2) => {
        const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
        return p1 + unescaped;
      }
    ],
    [
      /\\\\\\(?=[$.|*+(){^])/g,
      () => ESCAPE
    ],
    [
      /\\\\/g,
      () => ESCAPE
    ],
    [
      /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
      (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
    ],
    [
      /(?:[^*])$/,
      (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
    ],
    [
      /(\^|\\\/)?\\\*$/,
      (_, p1) => {
        const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
        return `${prefix}(?=$|\\/$)`;
      }
    ]
  ];
  var regexCache = Object.create(null);
  var makeRegex = (pattern, ignoreCase) => {
    let source = regexCache[pattern];
    if (!source) {
      source = REPLACERS.reduce((prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)), pattern);
      regexCache[pattern] = source;
    }
    return ignoreCase ? new RegExp(source, "i") : new RegExp(source);
  };
  var isString = (subject) => typeof subject === "string";
  var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
  var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF);

  class IgnoreRule {
    constructor(origin, pattern, negative, regex) {
      this.origin = origin;
      this.pattern = pattern;
      this.negative = negative;
      this.regex = regex;
    }
  }
  var createRule = (pattern, ignoreCase) => {
    const origin = pattern;
    let negative = false;
    if (pattern.indexOf("!") === 0) {
      negative = true;
      pattern = pattern.substr(1);
    }
    pattern = pattern.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
    const regex = makeRegex(pattern, ignoreCase);
    return new IgnoreRule(origin, pattern, negative, regex);
  };
  var throwError = (message, Ctor) => {
    throw new Ctor(message);
  };
  var checkPath = (path, originalPath, doThrow) => {
    if (!isString(path)) {
      return doThrow(`path must be a string, but got \`${originalPath}\``, TypeError);
    }
    if (!path) {
      return doThrow(`path must not be empty`, TypeError);
    }
    if (checkPath.isNotRelative(path)) {
      const r = "`path.relative()`d";
      return doThrow(`path should be a ${r} string, but got "${originalPath}"`, RangeError);
    }
    return true;
  };
  var isNotRelative = (path) => REGEX_TEST_INVALID_PATH.test(path);
  checkPath.isNotRelative = isNotRelative;
  checkPath.convert = (p) => p;

  class Ignore {
    constructor({
      ignorecase = true,
      ignoreCase = ignorecase,
      allowRelativePaths = false
    } = {}) {
      define2(this, KEY_IGNORE, true);
      this._rules = [];
      this._ignoreCase = ignoreCase;
      this._allowRelativePaths = allowRelativePaths;
      this._initCache();
    }
    _initCache() {
      this._ignoreCache = Object.create(null);
      this._testCache = Object.create(null);
    }
    _addPattern(pattern) {
      if (pattern && pattern[KEY_IGNORE]) {
        this._rules = this._rules.concat(pattern._rules);
        this._added = true;
        return;
      }
      if (checkPattern(pattern)) {
        const rule = createRule(pattern, this._ignoreCase);
        this._added = true;
        this._rules.push(rule);
      }
    }
    add(pattern) {
      this._added = false;
      makeArray(isString(pattern) ? splitPattern(pattern) : pattern).forEach(this._addPattern, this);
      if (this._added) {
        this._initCache();
      }
      return this;
    }
    addPattern(pattern) {
      return this.add(pattern);
    }
    _testOne(path, checkUnignored) {
      let ignored = false;
      let unignored = false;
      this._rules.forEach((rule) => {
        const { negative } = rule;
        if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
          return;
        }
        const matched = rule.regex.test(path);
        if (matched) {
          ignored = !negative;
          unignored = negative;
        }
      });
      return {
        ignored,
        unignored
      };
    }
    _test(originalPath, cache, checkUnignored, slices) {
      const path = originalPath && checkPath.convert(originalPath);
      checkPath(path, originalPath, this._allowRelativePaths ? RETURN_FALSE : throwError);
      return this._t(path, cache, checkUnignored, slices);
    }
    _t(path, cache, checkUnignored, slices) {
      if (path in cache) {
        return cache[path];
      }
      if (!slices) {
        slices = path.split(SLASH);
      }
      slices.pop();
      if (!slices.length) {
        return cache[path] = this._testOne(path, checkUnignored);
      }
      const parent = this._t(slices.join(SLASH) + SLASH, cache, checkUnignored, slices);
      return cache[path] = parent.ignored ? parent : this._testOne(path, checkUnignored);
    }
    ignores(path) {
      return this._test(path, this._ignoreCache, false).ignored;
    }
    createFilter() {
      return (path) => !this.ignores(path);
    }
    filter(paths) {
      return makeArray(paths).filter(this.createFilter());
    }
    test(path) {
      return this._test(path, this._testCache, true);
    }
  }
  var factory = (options) => new Ignore(options);
  var isPathValid = (path) => checkPath(path && checkPath.convert(path), path, RETURN_FALSE);
  factory.isPathValid = isPathValid;
  factory.default = factory;
  module.exports = factory;
  if (typeof process !== "undefined" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")) {
    const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
    checkPath.convert = makePosix;
    const REGIX_IS_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
    checkPath.isNotRelative = (path) => REGIX_IS_WINDOWS_PATH_ABSOLUTE.test(path) || isNotRelative(path);
  }
});

// node_modules/clean-git-ref/lib/index.js
var require_lib2 = __commonJS((exports, module) => {
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function replaceAll(str, search, replacement) {
    search = search instanceof RegExp ? search : new RegExp(escapeRegExp(search), "g");
    return str.replace(search, replacement);
  }
  var CleanGitRef = {
    clean: function clean(value) {
      if (typeof value !== "string") {
        throw new Error("Expected a string, received: " + value);
      }
      value = replaceAll(value, "./", "/");
      value = replaceAll(value, "..", ".");
      value = replaceAll(value, " ", "-");
      value = replaceAll(value, /^[~^:?*\\\-]/g, "");
      value = replaceAll(value, /[~^:?*\\]/g, "-");
      value = replaceAll(value, /[~^:?*\\\-]$/g, "");
      value = replaceAll(value, "@{", "-");
      value = replaceAll(value, /\.$/g, "");
      value = replaceAll(value, /\/$/g, "");
      value = replaceAll(value, /\.lock$/g, "");
      return value;
    }
  };
  module.exports = CleanGitRef;
});

// node_modules/diff3/onp.js
var require_onp = __commonJS((exports, module) => {
  module.exports = function(a_, b_) {
    var a = a_, b = b_, m = a.length, n = b.length, reverse = false, ed = null, offset = m + 1, path = [], pathposi = [], ses = [], lcs = "", SES_DELETE = -1, SES_COMMON = 0, SES_ADD = 1;
    var tmp1, tmp2;
    var init = function() {
      if (m >= n) {
        tmp1 = a;
        tmp2 = m;
        a = b;
        b = tmp1;
        m = n;
        n = tmp2;
        reverse = true;
        offset = m + 1;
      }
    };
    var P = function(x, y, k) {
      return {
        x,
        y,
        k
      };
    };
    var seselem = function(elem, t) {
      return {
        elem,
        t
      };
    };
    var snake = function(k, p, pp) {
      var r, x, y;
      if (p > pp) {
        r = path[k - 1 + offset];
      } else {
        r = path[k + 1 + offset];
      }
      y = Math.max(p, pp);
      x = y - k;
      while (x < m && y < n && a[x] === b[y]) {
        ++x;
        ++y;
      }
      path[k + offset] = pathposi.length;
      pathposi[pathposi.length] = new P(x, y, r);
      return y;
    };
    var recordseq = function(epc) {
      var x_idx, y_idx, px_idx, py_idx, i;
      x_idx = y_idx = 1;
      px_idx = py_idx = 0;
      for (i = epc.length - 1;i >= 0; --i) {
        while (px_idx < epc[i].x || py_idx < epc[i].y) {
          if (epc[i].y - epc[i].x > py_idx - px_idx) {
            if (reverse) {
              ses[ses.length] = new seselem(b[py_idx], SES_DELETE);
            } else {
              ses[ses.length] = new seselem(b[py_idx], SES_ADD);
            }
            ++y_idx;
            ++py_idx;
          } else if (epc[i].y - epc[i].x < py_idx - px_idx) {
            if (reverse) {
              ses[ses.length] = new seselem(a[px_idx], SES_ADD);
            } else {
              ses[ses.length] = new seselem(a[px_idx], SES_DELETE);
            }
            ++x_idx;
            ++px_idx;
          } else {
            ses[ses.length] = new seselem(a[px_idx], SES_COMMON);
            lcs += a[px_idx];
            ++x_idx;
            ++y_idx;
            ++px_idx;
            ++py_idx;
          }
        }
      }
    };
    init();
    return {
      SES_DELETE: -1,
      SES_COMMON: 0,
      SES_ADD: 1,
      editdistance: function() {
        return ed;
      },
      getlcs: function() {
        return lcs;
      },
      getses: function() {
        return ses;
      },
      compose: function() {
        var delta, size, fp, p, r, epc, i, k;
        delta = n - m;
        size = m + n + 3;
        fp = {};
        for (i = 0;i < size; ++i) {
          fp[i] = -1;
          path[i] = -1;
        }
        p = -1;
        do {
          ++p;
          for (k = -p;k <= delta - 1; ++k) {
            fp[k + offset] = snake(k, fp[k - 1 + offset] + 1, fp[k + 1 + offset]);
          }
          for (k = delta + p;k >= delta + 1; --k) {
            fp[k + offset] = snake(k, fp[k - 1 + offset] + 1, fp[k + 1 + offset]);
          }
          fp[delta + offset] = snake(delta, fp[delta - 1 + offset] + 1, fp[delta + 1 + offset]);
        } while (fp[delta + offset] !== n);
        ed = delta + 2 * p;
        r = path[delta + offset];
        epc = [];
        while (r !== -1) {
          epc[epc.length] = new P(pathposi[r].x, pathposi[r].y, null);
          r = pathposi[r].k;
        }
        recordseq(epc);
      }
    };
  };
});

// node_modules/diff3/diff3.js
var require_diff3 = __commonJS((exports, module) => {
  var onp = require_onp();
  function longestCommonSubsequence(file1, file2) {
    var diff = new onp(file1, file2);
    diff.compose();
    var ses = diff.getses();
    var root;
    var prev;
    var file1RevIdx = file1.length - 1, file2RevIdx = file2.length - 1;
    for (var i = ses.length - 1;i >= 0; --i) {
      if (ses[i].t === diff.SES_COMMON) {
        if (prev) {
          prev.chain = {
            file1index: file1RevIdx,
            file2index: file2RevIdx,
            chain: null
          };
          prev = prev.chain;
        } else {
          root = {
            file1index: file1RevIdx,
            file2index: file2RevIdx,
            chain: null
          };
          prev = root;
        }
        file1RevIdx--;
        file2RevIdx--;
      } else if (ses[i].t === diff.SES_DELETE) {
        file1RevIdx--;
      } else if (ses[i].t === diff.SES_ADD) {
        file2RevIdx--;
      }
    }
    var tail = {
      file1index: -1,
      file2index: -1,
      chain: null
    };
    if (!prev) {
      return tail;
    }
    prev.chain = tail;
    return root;
  }
  function diffIndices(file1, file2) {
    var result = [];
    var tail1 = file1.length;
    var tail2 = file2.length;
    for (var candidate = longestCommonSubsequence(file1, file2);candidate !== null; candidate = candidate.chain) {
      var mismatchLength1 = tail1 - candidate.file1index - 1;
      var mismatchLength2 = tail2 - candidate.file2index - 1;
      tail1 = candidate.file1index;
      tail2 = candidate.file2index;
      if (mismatchLength1 || mismatchLength2) {
        result.push({
          file1: [tail1 + 1, mismatchLength1],
          file2: [tail2 + 1, mismatchLength2]
        });
      }
    }
    result.reverse();
    return result;
  }
  function diff3MergeIndices(a, o, b) {
    var i;
    var m1 = diffIndices(o, a);
    var m2 = diffIndices(o, b);
    var hunks = [];
    function addHunk(h, side2) {
      hunks.push([h.file1[0], side2, h.file1[1], h.file2[0], h.file2[1]]);
    }
    for (i = 0;i < m1.length; i++) {
      addHunk(m1[i], 0);
    }
    for (i = 0;i < m2.length; i++) {
      addHunk(m2[i], 2);
    }
    hunks.sort(function(x, y) {
      return x[0] - y[0];
    });
    var result = [];
    var commonOffset = 0;
    function copyCommon(targetOffset) {
      if (targetOffset > commonOffset) {
        result.push([1, commonOffset, targetOffset - commonOffset]);
        commonOffset = targetOffset;
      }
    }
    for (var hunkIndex = 0;hunkIndex < hunks.length; hunkIndex++) {
      var firstHunkIndex = hunkIndex;
      var hunk = hunks[hunkIndex];
      var regionLhs = hunk[0];
      var regionRhs = regionLhs + hunk[2];
      while (hunkIndex < hunks.length - 1) {
        var maybeOverlapping = hunks[hunkIndex + 1];
        var maybeLhs = maybeOverlapping[0];
        if (maybeLhs > regionRhs)
          break;
        regionRhs = Math.max(regionRhs, maybeLhs + maybeOverlapping[2]);
        hunkIndex++;
      }
      copyCommon(regionLhs);
      if (firstHunkIndex == hunkIndex) {
        if (hunk[4] > 0) {
          result.push([hunk[1], hunk[3], hunk[4]]);
        }
      } else {
        var regions = {
          0: [a.length, -1, o.length, -1],
          2: [b.length, -1, o.length, -1]
        };
        for (i = firstHunkIndex;i <= hunkIndex; i++) {
          hunk = hunks[i];
          var side = hunk[1];
          var r = regions[side];
          var oLhs = hunk[0];
          var oRhs = oLhs + hunk[2];
          var abLhs = hunk[3];
          var abRhs = abLhs + hunk[4];
          r[0] = Math.min(abLhs, r[0]);
          r[1] = Math.max(abRhs, r[1]);
          r[2] = Math.min(oLhs, r[2]);
          r[3] = Math.max(oRhs, r[3]);
        }
        var aLhs = regions[0][0] + (regionLhs - regions[0][2]);
        var aRhs = regions[0][1] + (regionRhs - regions[0][3]);
        var bLhs = regions[2][0] + (regionLhs - regions[2][2]);
        var bRhs = regions[2][1] + (regionRhs - regions[2][3]);
        result.push([
          -1,
          aLhs,
          aRhs - aLhs,
          regionLhs,
          regionRhs - regionLhs,
          bLhs,
          bRhs - bLhs
        ]);
      }
      commonOffset = regionRhs;
    }
    copyCommon(o.length);
    return result;
  }
  function diff3Merge(a, o, b) {
    var result = [];
    var files = [a, o, b];
    var indices = diff3MergeIndices(a, o, b);
    var okLines = [];
    function flushOk() {
      if (okLines.length) {
        result.push({
          ok: okLines
        });
      }
      okLines = [];
    }
    function pushOk(xs) {
      for (var j = 0;j < xs.length; j++) {
        okLines.push(xs[j]);
      }
    }
    function isTrueConflict(rec) {
      if (rec[2] != rec[6])
        return true;
      var aoff = rec[1];
      var boff = rec[5];
      for (var j = 0;j < rec[2]; j++) {
        if (a[j + aoff] != b[j + boff])
          return true;
      }
      return false;
    }
    for (var i = 0;i < indices.length; i++) {
      var x = indices[i];
      var side = x[0];
      if (side == -1) {
        if (!isTrueConflict(x)) {
          pushOk(files[0].slice(x[1], x[1] + x[2]));
        } else {
          flushOk();
          result.push({
            conflict: {
              a: a.slice(x[1], x[1] + x[2]),
              aIndex: x[1],
              o: o.slice(x[3], x[3] + x[4]),
              oIndex: x[3],
              b: b.slice(x[5], x[5] + x[6]),
              bIndex: x[5]
            }
          });
        }
      } else {
        pushOk(files[side].slice(x[1], x[1] + x[2]));
      }
    }
    flushOk();
    return result;
  }
  module.exports = diff3Merge;
});

// node_modules/isomorphic-git/index.cjs
var require_isomorphic_git = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  function _interopDefault(ex) {
    return ex && typeof ex === "object" && "default" in ex ? ex["default"] : ex;
  }
  var AsyncLock = _interopDefault(require_lib());
  var Hash = _interopDefault(require_sha1());
  var crc32 = _interopDefault(require_crc32());
  var pako = _interopDefault(require_pako());
  var pify = _interopDefault(require_pify());
  var ignore = _interopDefault(require_ignore());
  var cleanGitRef = _interopDefault(require_lib2());
  var diff3Merge = _interopDefault(require_diff3());

  class BaseError extends Error {
    constructor(message) {
      super(message);
      this.caller = "";
    }
    toJSON() {
      return {
        code: this.code,
        data: this.data,
        caller: this.caller,
        message: this.message,
        stack: this.stack
      };
    }
    fromJSON(json) {
      const e = new BaseError(json.message);
      e.code = json.code;
      e.data = json.data;
      e.caller = json.caller;
      e.stack = json.stack;
      return e;
    }
    get isIsomorphicGitError() {
      return true;
    }
  }

  class UnmergedPathsError extends BaseError {
    constructor(filepaths) {
      super(`Modifying the index is not possible because you have unmerged files: ${filepaths.toString}. Fix them up in the work tree, and then use 'git add/rm as appropriate to mark resolution and make a commit.`);
      this.code = this.name = UnmergedPathsError.code;
      this.data = { filepaths };
    }
  }
  UnmergedPathsError.code = "UnmergedPathsError";

  class InternalError extends BaseError {
    constructor(message) {
      super(`An internal error caused this command to fail.

If you're not a developer, report the bug to the developers of the application you're using. If this is a bug in isomorphic-git then you should create a proper bug yourselves. The bug should include a minimal reproduction and details about the version and environment.

Please file a bug report at https://github.com/isomorphic-git/isomorphic-git/issues with this error message: ${message}`);
      this.code = this.name = InternalError.code;
      this.data = { message };
    }
  }
  InternalError.code = "InternalError";

  class UnsafeFilepathError extends BaseError {
    constructor(filepath) {
      super(`The filepath "${filepath}" contains unsafe character sequences`);
      this.code = this.name = UnsafeFilepathError.code;
      this.data = { filepath };
    }
  }
  UnsafeFilepathError.code = "UnsafeFilepathError";

  class BufferCursor {
    constructor(buffer) {
      this.buffer = buffer;
      this._start = 0;
    }
    eof() {
      return this._start >= this.buffer.length;
    }
    tell() {
      return this._start;
    }
    seek(n) {
      this._start = n;
    }
    slice(n) {
      const r = this.buffer.slice(this._start, this._start + n);
      this._start += n;
      return r;
    }
    toString(enc, length) {
      const r = this.buffer.toString(enc, this._start, this._start + length);
      this._start += length;
      return r;
    }
    write(value, length, enc) {
      const r = this.buffer.write(value, this._start, length, enc);
      this._start += length;
      return r;
    }
    copy(source, start, end) {
      const r = source.copy(this.buffer, this._start, start, end);
      this._start += r;
      return r;
    }
    readUInt8() {
      const r = this.buffer.readUInt8(this._start);
      this._start += 1;
      return r;
    }
    writeUInt8(value) {
      const r = this.buffer.writeUInt8(value, this._start);
      this._start += 1;
      return r;
    }
    readUInt16BE() {
      const r = this.buffer.readUInt16BE(this._start);
      this._start += 2;
      return r;
    }
    writeUInt16BE(value) {
      const r = this.buffer.writeUInt16BE(value, this._start);
      this._start += 2;
      return r;
    }
    readUInt32BE() {
      const r = this.buffer.readUInt32BE(this._start);
      this._start += 4;
      return r;
    }
    writeUInt32BE(value) {
      const r = this.buffer.writeUInt32BE(value, this._start);
      this._start += 4;
      return r;
    }
  }
  function compareStrings(a, b) {
    return -(a < b) || +(a > b);
  }
  function comparePath(a, b) {
    return compareStrings(a.path, b.path);
  }
  function normalizeMode(mode) {
    let type = mode > 0 ? mode >> 12 : 0;
    if (type !== 4 && type !== 8 && type !== 10 && type !== 14) {
      type = 8;
    }
    let permissions = mode & 511;
    if (permissions & 73) {
      permissions = 493;
    } else {
      permissions = 420;
    }
    if (type !== 8)
      permissions = 0;
    return (type << 12) + permissions;
  }
  var MAX_UINT32 = 2 ** 32;
  function SecondsNanoseconds(givenSeconds, givenNanoseconds, milliseconds, date) {
    if (givenSeconds !== undefined && givenNanoseconds !== undefined) {
      return [givenSeconds, givenNanoseconds];
    }
    if (milliseconds === undefined) {
      milliseconds = date.valueOf();
    }
    const seconds = Math.floor(milliseconds / 1000);
    const nanoseconds = (milliseconds - seconds * 1000) * 1e6;
    return [seconds, nanoseconds];
  }
  function normalizeStats(e) {
    const [ctimeSeconds, ctimeNanoseconds] = SecondsNanoseconds(e.ctimeSeconds, e.ctimeNanoseconds, e.ctimeMs, e.ctime);
    const [mtimeSeconds, mtimeNanoseconds] = SecondsNanoseconds(e.mtimeSeconds, e.mtimeNanoseconds, e.mtimeMs, e.mtime);
    return {
      ctimeSeconds: ctimeSeconds % MAX_UINT32,
      ctimeNanoseconds: ctimeNanoseconds % MAX_UINT32,
      mtimeSeconds: mtimeSeconds % MAX_UINT32,
      mtimeNanoseconds: mtimeNanoseconds % MAX_UINT32,
      dev: e.dev % MAX_UINT32,
      ino: e.ino % MAX_UINT32,
      mode: normalizeMode(e.mode % MAX_UINT32),
      uid: e.uid % MAX_UINT32,
      gid: e.gid % MAX_UINT32,
      size: e.size > -1 ? e.size % MAX_UINT32 : 0
    };
  }
  function toHex(buffer) {
    let hex = "";
    for (const byte of new Uint8Array(buffer)) {
      if (byte < 16)
        hex += "0";
      hex += byte.toString(16);
    }
    return hex;
  }
  var supportsSubtleSHA1 = null;
  async function shasum(buffer) {
    if (supportsSubtleSHA1 === null) {
      supportsSubtleSHA1 = await testSubtleSHA1();
    }
    return supportsSubtleSHA1 ? subtleSHA1(buffer) : shasumSync(buffer);
  }
  function shasumSync(buffer) {
    return new Hash().update(buffer).digest("hex");
  }
  async function subtleSHA1(buffer) {
    const hash = await crypto.subtle.digest("SHA-1", buffer);
    return toHex(hash);
  }
  async function testSubtleSHA1() {
    try {
      const hash = await subtleSHA1(new Uint8Array([]));
      return hash === "da39a3ee5e6b4b0d3255bfef95601890afd80709";
    } catch (_) {}
    return false;
  }
  function parseCacheEntryFlags(bits) {
    return {
      assumeValid: Boolean(bits & 32768),
      extended: Boolean(bits & 16384),
      stage: (bits & 12288) >> 12,
      nameLength: bits & 4095
    };
  }
  function renderCacheEntryFlags(entry) {
    const flags = entry.flags;
    flags.extended = false;
    flags.nameLength = Math.min(Buffer.from(entry.path).length, 4095);
    return (flags.assumeValid ? 32768 : 0) + (flags.extended ? 16384 : 0) + ((flags.stage & 3) << 12) + (flags.nameLength & 4095);
  }

  class GitIndex {
    constructor(entries, unmergedPaths) {
      this._dirty = false;
      this._unmergedPaths = unmergedPaths || new Set;
      this._entries = entries || new Map;
    }
    _addEntry(entry) {
      if (entry.flags.stage === 0) {
        entry.stages = [entry];
        this._entries.set(entry.path, entry);
        this._unmergedPaths.delete(entry.path);
      } else {
        let existingEntry = this._entries.get(entry.path);
        if (!existingEntry) {
          this._entries.set(entry.path, entry);
          existingEntry = entry;
        }
        existingEntry.stages[entry.flags.stage] = entry;
        this._unmergedPaths.add(entry.path);
      }
    }
    static async from(buffer) {
      if (Buffer.isBuffer(buffer)) {
        return GitIndex.fromBuffer(buffer);
      } else if (buffer === null) {
        return new GitIndex(null);
      } else {
        throw new InternalError("invalid type passed to GitIndex.from");
      }
    }
    static async fromBuffer(buffer) {
      if (buffer.length === 0) {
        throw new InternalError("Index file is empty (.git/index)");
      }
      const index2 = new GitIndex;
      const reader = new BufferCursor(buffer);
      const magic = reader.toString("utf8", 4);
      if (magic !== "DIRC") {
        throw new InternalError(`Invalid dircache magic file number: ${magic}`);
      }
      const shaComputed = await shasum(buffer.slice(0, -20));
      const shaClaimed = buffer.slice(-20).toString("hex");
      if (shaClaimed !== shaComputed) {
        throw new InternalError(`Invalid checksum in GitIndex buffer: expected ${shaClaimed} but saw ${shaComputed}`);
      }
      const version2 = reader.readUInt32BE();
      if (version2 !== 2) {
        throw new InternalError(`Unsupported dircache version: ${version2}`);
      }
      const numEntries = reader.readUInt32BE();
      let i = 0;
      while (!reader.eof() && i < numEntries) {
        const entry = {};
        entry.ctimeSeconds = reader.readUInt32BE();
        entry.ctimeNanoseconds = reader.readUInt32BE();
        entry.mtimeSeconds = reader.readUInt32BE();
        entry.mtimeNanoseconds = reader.readUInt32BE();
        entry.dev = reader.readUInt32BE();
        entry.ino = reader.readUInt32BE();
        entry.mode = reader.readUInt32BE();
        entry.uid = reader.readUInt32BE();
        entry.gid = reader.readUInt32BE();
        entry.size = reader.readUInt32BE();
        entry.oid = reader.slice(20).toString("hex");
        const flags = reader.readUInt16BE();
        entry.flags = parseCacheEntryFlags(flags);
        const pathlength = buffer.indexOf(0, reader.tell() + 1) - reader.tell();
        if (pathlength < 1) {
          throw new InternalError(`Got a path length of: ${pathlength}`);
        }
        entry.path = reader.toString("utf8", pathlength);
        if (entry.path.includes("..\\") || entry.path.includes("../")) {
          throw new UnsafeFilepathError(entry.path);
        }
        let padding = 8 - (reader.tell() - 12) % 8;
        if (padding === 0)
          padding = 8;
        while (padding--) {
          const tmp = reader.readUInt8();
          if (tmp !== 0) {
            throw new InternalError(`Expected 1-8 null characters but got '${tmp}' after ${entry.path}`);
          } else if (reader.eof()) {
            throw new InternalError("Unexpected end of file");
          }
        }
        entry.stages = [];
        index2._addEntry(entry);
        i++;
      }
      return index2;
    }
    get unmergedPaths() {
      return [...this._unmergedPaths];
    }
    get entries() {
      return [...this._entries.values()].sort(comparePath);
    }
    get entriesMap() {
      return this._entries;
    }
    get entriesFlat() {
      return [...this.entries].flatMap((entry) => {
        return entry.stages.length > 1 ? entry.stages.filter((x) => x) : entry;
      });
    }
    *[Symbol.iterator]() {
      for (const entry of this.entries) {
        yield entry;
      }
    }
    insert({ filepath, stats, oid, stage = 0 }) {
      if (!stats) {
        stats = {
          ctimeSeconds: 0,
          ctimeNanoseconds: 0,
          mtimeSeconds: 0,
          mtimeNanoseconds: 0,
          dev: 0,
          ino: 0,
          mode: 0,
          uid: 0,
          gid: 0,
          size: 0
        };
      }
      stats = normalizeStats(stats);
      const bfilepath = Buffer.from(filepath);
      const entry = {
        ctimeSeconds: stats.ctimeSeconds,
        ctimeNanoseconds: stats.ctimeNanoseconds,
        mtimeSeconds: stats.mtimeSeconds,
        mtimeNanoseconds: stats.mtimeNanoseconds,
        dev: stats.dev,
        ino: stats.ino,
        mode: stats.mode || 33188,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        path: filepath,
        oid,
        flags: {
          assumeValid: false,
          extended: false,
          stage,
          nameLength: bfilepath.length < 4095 ? bfilepath.length : 4095
        },
        stages: []
      };
      this._addEntry(entry);
      this._dirty = true;
    }
    delete({ filepath }) {
      if (this._entries.has(filepath)) {
        this._entries.delete(filepath);
      } else {
        for (const key of this._entries.keys()) {
          if (key.startsWith(filepath + "/")) {
            this._entries.delete(key);
          }
        }
      }
      if (this._unmergedPaths.has(filepath)) {
        this._unmergedPaths.delete(filepath);
      }
      this._dirty = true;
    }
    clear() {
      this._entries.clear();
      this._dirty = true;
    }
    has({ filepath }) {
      return this._entries.has(filepath);
    }
    render() {
      return this.entries.map((entry) => `${entry.mode.toString(8)} ${entry.oid}    ${entry.path}`).join(`
`);
    }
    static async _entryToBuffer(entry) {
      const bpath = Buffer.from(entry.path);
      const length = Math.ceil((62 + bpath.length + 1) / 8) * 8;
      const written = Buffer.alloc(length);
      const writer = new BufferCursor(written);
      const stat = normalizeStats(entry);
      writer.writeUInt32BE(stat.ctimeSeconds);
      writer.writeUInt32BE(stat.ctimeNanoseconds);
      writer.writeUInt32BE(stat.mtimeSeconds);
      writer.writeUInt32BE(stat.mtimeNanoseconds);
      writer.writeUInt32BE(stat.dev);
      writer.writeUInt32BE(stat.ino);
      writer.writeUInt32BE(stat.mode);
      writer.writeUInt32BE(stat.uid);
      writer.writeUInt32BE(stat.gid);
      writer.writeUInt32BE(stat.size);
      writer.write(entry.oid, 20, "hex");
      writer.writeUInt16BE(renderCacheEntryFlags(entry));
      writer.write(entry.path, bpath.length, "utf8");
      return written;
    }
    async toObject() {
      const header = Buffer.alloc(12);
      const writer = new BufferCursor(header);
      writer.write("DIRC", 4, "utf8");
      writer.writeUInt32BE(2);
      writer.writeUInt32BE(this.entriesFlat.length);
      let entryBuffers = [];
      for (const entry of this.entries) {
        entryBuffers.push(GitIndex._entryToBuffer(entry));
        if (entry.stages.length > 1) {
          for (const stage of entry.stages) {
            if (stage && stage !== entry) {
              entryBuffers.push(GitIndex._entryToBuffer(stage));
            }
          }
        }
      }
      entryBuffers = await Promise.all(entryBuffers);
      const body = Buffer.concat(entryBuffers);
      const main = Buffer.concat([header, body]);
      const sum = await shasum(main);
      return Buffer.concat([main, Buffer.from(sum, "hex")]);
    }
  }
  function compareStats(entry, stats, filemode = true, trustino = true) {
    const e = normalizeStats(entry);
    const s = normalizeStats(stats);
    const staleness = filemode && e.mode !== s.mode || e.mtimeSeconds !== s.mtimeSeconds || e.ctimeSeconds !== s.ctimeSeconds || e.uid !== s.uid || e.gid !== s.gid || trustino && e.ino !== s.ino || e.size !== s.size;
    return staleness;
  }
  var lock = null;
  var IndexCache = Symbol("IndexCache");
  function createCache() {
    return {
      map: new Map,
      stats: new Map
    };
  }
  async function updateCachedIndexFile(fs, filepath, cache) {
    const [stat, rawIndexFile] = await Promise.all([
      fs.lstat(filepath),
      fs.read(filepath)
    ]);
    const index2 = await GitIndex.from(rawIndexFile);
    cache.map.set(filepath, index2);
    cache.stats.set(filepath, stat);
  }
  async function isIndexStale(fs, filepath, cache) {
    const savedStats = cache.stats.get(filepath);
    if (savedStats === undefined)
      return true;
    if (savedStats === null)
      return false;
    const currStats = await fs.lstat(filepath);
    if (currStats === null)
      return false;
    return compareStats(savedStats, currStats);
  }

  class GitIndexManager {
    static async acquire({ fs, gitdir, cache, allowUnmerged = true }, closure) {
      if (!cache[IndexCache]) {
        cache[IndexCache] = createCache();
      }
      const filepath = `${gitdir}/index`;
      if (lock === null)
        lock = new AsyncLock({ maxPending: Infinity });
      let result;
      let unmergedPaths = [];
      await lock.acquire(filepath, async () => {
        const theIndexCache = cache[IndexCache];
        if (await isIndexStale(fs, filepath, theIndexCache)) {
          await updateCachedIndexFile(fs, filepath, theIndexCache);
        }
        const index2 = theIndexCache.map.get(filepath);
        unmergedPaths = index2.unmergedPaths;
        if (unmergedPaths.length && !allowUnmerged)
          throw new UnmergedPathsError(unmergedPaths);
        result = await closure(index2);
        if (index2._dirty) {
          const buffer = await index2.toObject();
          await fs.write(filepath, buffer);
          theIndexCache.stats.set(filepath, await fs.lstat(filepath));
          index2._dirty = false;
        }
      });
      return result;
    }
  }
  function basename(path) {
    const last = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    if (last > -1) {
      path = path.slice(last + 1);
    }
    return path;
  }
  function dirname(path) {
    const last = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    if (last === -1)
      return ".";
    if (last === 0)
      return "/";
    return path.slice(0, last);
  }
  function flatFileListToDirectoryStructure(files) {
    const inodes = new Map;
    const mkdir = function(name) {
      if (!inodes.has(name)) {
        const dir = {
          type: "tree",
          fullpath: name,
          basename: basename(name),
          metadata: {},
          children: []
        };
        inodes.set(name, dir);
        dir.parent = mkdir(dirname(name));
        if (dir.parent && dir.parent !== dir)
          dir.parent.children.push(dir);
      }
      return inodes.get(name);
    };
    const mkfile = function(name, metadata) {
      if (!inodes.has(name)) {
        const file = {
          type: "blob",
          fullpath: name,
          basename: basename(name),
          metadata,
          parent: mkdir(dirname(name)),
          children: []
        };
        if (file.parent)
          file.parent.children.push(file);
        inodes.set(name, file);
      }
      return inodes.get(name);
    };
    mkdir(".");
    for (const file of files) {
      mkfile(file.path, file);
    }
    return inodes;
  }
  function mode2type(mode) {
    switch (mode) {
      case 16384:
        return "tree";
      case 33188:
        return "blob";
      case 33261:
        return "blob";
      case 40960:
        return "blob";
      case 57344:
        return "commit";
    }
    throw new InternalError(`Unexpected GitTree entry mode: ${mode.toString(8)}`);
  }

  class GitWalkerIndex {
    constructor({ fs, gitdir, cache }) {
      this.treePromise = GitIndexManager.acquire({ fs, gitdir, cache }, async function(index2) {
        return flatFileListToDirectoryStructure(index2.entries);
      });
      const walker = this;
      this.ConstructEntry = class StageEntry {
        constructor(fullpath) {
          this._fullpath = fullpath;
          this._type = false;
          this._mode = false;
          this._stat = false;
          this._oid = false;
        }
        async type() {
          return walker.type(this);
        }
        async mode() {
          return walker.mode(this);
        }
        async stat() {
          return walker.stat(this);
        }
        async content() {
          return walker.content(this);
        }
        async oid() {
          return walker.oid(this);
        }
      };
    }
    async readdir(entry) {
      const filepath = entry._fullpath;
      const tree = await this.treePromise;
      const inode = tree.get(filepath);
      if (!inode)
        return null;
      if (inode.type === "blob")
        return null;
      if (inode.type !== "tree") {
        throw new Error(`ENOTDIR: not a directory, scandir '${filepath}'`);
      }
      const names = inode.children.map((inode2) => inode2.fullpath);
      names.sort(compareStrings);
      return names;
    }
    async type(entry) {
      if (entry._type === false) {
        await entry.stat();
      }
      return entry._type;
    }
    async mode(entry) {
      if (entry._mode === false) {
        await entry.stat();
      }
      return entry._mode;
    }
    async stat(entry) {
      if (entry._stat === false) {
        const tree = await this.treePromise;
        const inode = tree.get(entry._fullpath);
        if (!inode) {
          throw new Error(`ENOENT: no such file or directory, lstat '${entry._fullpath}'`);
        }
        const stats = inode.type === "tree" ? {} : normalizeStats(inode.metadata);
        entry._type = inode.type === "tree" ? "tree" : mode2type(stats.mode);
        entry._mode = stats.mode;
        if (inode.type === "tree") {
          entry._stat = undefined;
        } else {
          entry._stat = stats;
        }
      }
      return entry._stat;
    }
    async content(_entry) {}
    async oid(entry) {
      if (entry._oid === false) {
        const tree = await this.treePromise;
        const inode = tree.get(entry._fullpath);
        entry._oid = inode.metadata.oid;
      }
      return entry._oid;
    }
  }
  var GitWalkSymbol = Symbol("GitWalkSymbol");
  function STAGE() {
    const o = Object.create(null);
    Object.defineProperty(o, GitWalkSymbol, {
      value: function({ fs, gitdir, cache }) {
        return new GitWalkerIndex({ fs, gitdir, cache });
      }
    });
    Object.freeze(o);
    return o;
  }

  class NotFoundError extends BaseError {
    constructor(what) {
      super(`Could not find ${what}.`);
      this.code = this.name = NotFoundError.code;
      this.data = { what };
    }
  }
  NotFoundError.code = "NotFoundError";

  class ObjectTypeError extends BaseError {
    constructor(oid, actual, expected, filepath) {
      super(`Object ${oid} ${filepath ? `at ${filepath}` : ""}was anticipated to be a ${expected} but it is a ${actual}.`);
      this.code = this.name = ObjectTypeError.code;
      this.data = { oid, actual, expected, filepath };
    }
  }
  ObjectTypeError.code = "ObjectTypeError";

  class InvalidOidError extends BaseError {
    constructor(value) {
      super(`Expected a 40-char hex object id but saw "${value}".`);
      this.code = this.name = InvalidOidError.code;
      this.data = { value };
    }
  }
  InvalidOidError.code = "InvalidOidError";

  class NoRefspecError extends BaseError {
    constructor(remote) {
      super(`Could not find a fetch refspec for remote "${remote}". Make sure the config file has an entry like the following:
[remote "${remote}"]
	fetch = +refs/heads/*:refs/remotes/origin/*
`);
      this.code = this.name = NoRefspecError.code;
      this.data = { remote };
    }
  }
  NoRefspecError.code = "NoRefspecError";

  class GitPackedRefs {
    constructor(text) {
      this.refs = new Map;
      this.parsedConfig = [];
      if (text) {
        let key = null;
        this.parsedConfig = text.trim().split(`
`).map((line) => {
          if (/^\s*#/.test(line)) {
            return { line, comment: true };
          }
          const i = line.indexOf(" ");
          if (line.startsWith("^")) {
            const value = line.slice(1);
            this.refs.set(key + "^{}", value);
            return { line, ref: key, peeled: value };
          } else {
            const value = line.slice(0, i);
            key = line.slice(i + 1);
            this.refs.set(key, value);
            return { line, ref: key, oid: value };
          }
        });
      }
      return this;
    }
    static from(text) {
      return new GitPackedRefs(text);
    }
    delete(ref) {
      this.parsedConfig = this.parsedConfig.filter((entry) => entry.ref !== ref);
      this.refs.delete(ref);
    }
    toString() {
      return this.parsedConfig.map(({ line }) => line).join(`
`) + `
`;
    }
  }

  class GitRefSpec {
    constructor({ remotePath, localPath, force, matchPrefix }) {
      Object.assign(this, {
        remotePath,
        localPath,
        force,
        matchPrefix
      });
    }
    static from(refspec) {
      const [forceMatch, remotePath, remoteGlobMatch, localPath, localGlobMatch] = refspec.match(/^(\+?)(.*?)(\*?):(.*?)(\*?)$/).slice(1);
      const force = forceMatch === "+";
      const remoteIsGlob = remoteGlobMatch === "*";
      const localIsGlob = localGlobMatch === "*";
      if (remoteIsGlob !== localIsGlob) {
        throw new InternalError("Invalid refspec");
      }
      return new GitRefSpec({
        remotePath,
        localPath,
        force,
        matchPrefix: remoteIsGlob
      });
    }
    translate(remoteBranch) {
      if (this.matchPrefix) {
        if (remoteBranch.startsWith(this.remotePath)) {
          return this.localPath + remoteBranch.replace(this.remotePath, "");
        }
      } else {
        if (remoteBranch === this.remotePath)
          return this.localPath;
      }
      return null;
    }
    reverseTranslate(localBranch) {
      if (this.matchPrefix) {
        if (localBranch.startsWith(this.localPath)) {
          return this.remotePath + localBranch.replace(this.localPath, "");
        }
      } else {
        if (localBranch === this.localPath)
          return this.remotePath;
      }
      return null;
    }
  }

  class GitRefSpecSet {
    constructor(rules = []) {
      this.rules = rules;
    }
    static from(refspecs) {
      const rules = [];
      for (const refspec of refspecs) {
        rules.push(GitRefSpec.from(refspec));
      }
      return new GitRefSpecSet(rules);
    }
    add(refspec) {
      const rule = GitRefSpec.from(refspec);
      this.rules.push(rule);
    }
    translate(remoteRefs) {
      const result = [];
      for (const rule of this.rules) {
        for (const remoteRef of remoteRefs) {
          const localRef = rule.translate(remoteRef);
          if (localRef) {
            result.push([remoteRef, localRef]);
          }
        }
      }
      return result;
    }
    translateOne(remoteRef) {
      let result = null;
      for (const rule of this.rules) {
        const localRef = rule.translate(remoteRef);
        if (localRef) {
          result = localRef;
        }
      }
      return result;
    }
    localNamespaces() {
      return this.rules.filter((rule) => rule.matchPrefix).map((rule) => rule.localPath.replace(/\/$/, ""));
    }
  }
  function compareRefNames(a, b) {
    const _a = a.replace(/\^\{\}$/, "");
    const _b = b.replace(/\^\{\}$/, "");
    const tmp = -(_a < _b) || +(_a > _b);
    if (tmp === 0) {
      return a.endsWith("^{}") ? 1 : -1;
    }
    return tmp;
  }
  /*!
   * This code for `path.join` is directly copied from @zenfs/core/path for bundle size improvements.
   * SPDX-License-Identifier: LGPL-3.0-or-later
   * Copyright (c) James Prevett and other ZenFS contributors.
   */
  function normalizeString(path, aar) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let char = "\x00";
    for (let i = 0;i <= path.length; ++i) {
      if (i < path.length)
        char = path[i];
      else if (char === "/")
        break;
      else
        char = "/";
      if (char === "/") {
        if (lastSlash === i - 1 || dots === 1) {} else if (dots === 2) {
          if (res.length < 2 || lastSegmentLength !== 2 || res.at(-1) !== "." || res.at(-2) !== ".") {
            if (res.length > 2) {
              const lastSlashIndex = res.lastIndexOf("/");
              if (lastSlashIndex === -1) {
                res = "";
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              }
              lastSlash = i;
              dots = 0;
              continue;
            } else if (res.length !== 0) {
              res = "";
              lastSegmentLength = 0;
              lastSlash = i;
              dots = 0;
              continue;
            }
          }
          if (aar) {
            res += res.length > 0 ? "/.." : "..";
            lastSegmentLength = 2;
          }
        } else {
          if (res.length > 0)
            res += "/" + path.slice(lastSlash + 1, i);
          else
            res = path.slice(lastSlash + 1, i);
          lastSegmentLength = i - lastSlash - 1;
        }
        lastSlash = i;
        dots = 0;
      } else if (char === "." && dots !== -1) {
        ++dots;
      } else {
        dots = -1;
      }
    }
    return res;
  }
  function normalize(path) {
    if (!path.length)
      return ".";
    const isAbsolute = path[0] === "/";
    const trailingSeparator = path.at(-1) === "/";
    path = normalizeString(path, !isAbsolute);
    if (!path.length) {
      if (isAbsolute)
        return "/";
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator)
      path += "/";
    return isAbsolute ? `/${path}` : path;
  }
  function join(...args) {
    if (args.length === 0)
      return ".";
    let joined;
    for (let i = 0;i < args.length; ++i) {
      const arg = args[i];
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += "/" + arg;
      }
    }
    if (joined === undefined)
      return ".";
    return normalize(joined);
  }
  var num = (val) => {
    if (typeof val === "number") {
      return val;
    }
    val = val.toLowerCase();
    let n = parseInt(val);
    if (val.endsWith("k"))
      n *= 1024;
    if (val.endsWith("m"))
      n *= 1024 * 1024;
    if (val.endsWith("g"))
      n *= 1024 * 1024 * 1024;
    return n;
  };
  var bool = (val) => {
    if (typeof val === "boolean") {
      return val;
    }
    val = val.trim().toLowerCase();
    if (val === "true" || val === "yes" || val === "on")
      return true;
    if (val === "false" || val === "no" || val === "off")
      return false;
    throw Error(`Expected 'true', 'false', 'yes', 'no', 'on', or 'off', but got ${val}`);
  };
  var schema = {
    core: {
      filemode: bool,
      bare: bool,
      logallrefupdates: bool,
      symlinks: bool,
      ignorecase: bool,
      bigFileThreshold: num
    }
  };
  var SECTION_LINE_REGEX = /^\[([A-Za-z0-9-.]+)(?: "(.*)")?\]$/;
  var SECTION_REGEX = /^[A-Za-z0-9-.]+$/;
  var VARIABLE_LINE_REGEX = /^([A-Za-z][A-Za-z-]*)(?: *= *(.*))?$/;
  var VARIABLE_NAME_REGEX = /^[A-Za-z][A-Za-z-]*$/;
  var VARIABLE_VALUE_COMMENT_REGEX = /^(.*?)( *[#;].*)$/;
  var extractSectionLine = (line) => {
    const matches = SECTION_LINE_REGEX.exec(line);
    if (matches != null) {
      const [section, subsection] = matches.slice(1);
      return [section, subsection];
    }
    return null;
  };
  var extractVariableLine = (line) => {
    const matches = VARIABLE_LINE_REGEX.exec(line);
    if (matches != null) {
      const [name, rawValue = "true"] = matches.slice(1);
      const valueWithoutComments = removeComments(rawValue);
      const valueWithoutQuotes = removeQuotes(valueWithoutComments);
      return [name, valueWithoutQuotes];
    }
    return null;
  };
  var removeComments = (rawValue) => {
    const commentMatches = VARIABLE_VALUE_COMMENT_REGEX.exec(rawValue);
    if (commentMatches == null) {
      return rawValue;
    }
    const [valueWithoutComment, comment] = commentMatches.slice(1);
    if (hasOddNumberOfQuotes(valueWithoutComment) && hasOddNumberOfQuotes(comment)) {
      return `${valueWithoutComment}${comment}`;
    }
    return valueWithoutComment;
  };
  var hasOddNumberOfQuotes = (text) => {
    const numberOfQuotes = (text.match(/(?:^|[^\\])"/g) || []).length;
    return numberOfQuotes % 2 !== 0;
  };
  var removeQuotes = (text) => {
    return text.split("").reduce((newText, c, idx, text2) => {
      const isQuote = c === '"' && text2[idx - 1] !== "\\";
      const isEscapeForQuote = c === "\\" && text2[idx + 1] === '"';
      if (isQuote || isEscapeForQuote) {
        return newText;
      }
      return newText + c;
    }, "");
  };
  var lower = (text) => {
    return text != null ? text.toLowerCase() : null;
  };
  var getPath = (section, subsection, name) => {
    return [lower(section), subsection, lower(name)].filter((a) => a != null).join(".");
  };
  var normalizePath = (path) => {
    const pathSegments = path.split(".");
    const section = pathSegments.shift();
    const name = pathSegments.pop();
    const subsection = pathSegments.length ? pathSegments.join(".") : undefined;
    return {
      section,
      subsection,
      name,
      path: getPath(section, subsection, name),
      sectionPath: getPath(section, subsection, null),
      isSection: !!section
    };
  };
  var findLastIndex = (array, callback) => {
    return array.reduce((lastIndex, item, index2) => {
      return callback(item) ? index2 : lastIndex;
    }, -1);
  };

  class GitConfig {
    constructor(text) {
      let section = null;
      let subsection = null;
      this.parsedConfig = text ? text.split(`
`).map((line) => {
        let name = null;
        let value = null;
        const trimmedLine = line.trim();
        const extractedSection = extractSectionLine(trimmedLine);
        const isSection = extractedSection != null;
        if (isSection) {
          [section, subsection] = extractedSection;
        } else {
          const extractedVariable = extractVariableLine(trimmedLine);
          const isVariable = extractedVariable != null;
          if (isVariable) {
            [name, value] = extractedVariable;
          }
        }
        const path = getPath(section, subsection, name);
        return { line, isSection, section, subsection, name, value, path };
      }) : [];
    }
    static from(text) {
      return new GitConfig(text);
    }
    async get(path, getall = false) {
      const normalizedPath = normalizePath(path).path;
      const allValues = this.parsedConfig.filter((config) => config.path === normalizedPath).map(({ section, name, value }) => {
        const fn = schema[section] && schema[section][name];
        return fn ? fn(value) : value;
      });
      return getall ? allValues : allValues.pop();
    }
    async getall(path) {
      return this.get(path, true);
    }
    async getSubsections(section) {
      return this.parsedConfig.filter((config) => config.isSection && config.section === section).map((config) => config.subsection);
    }
    async deleteSection(section, subsection) {
      this.parsedConfig = this.parsedConfig.filter((config) => !(config.section === section && config.subsection === subsection));
    }
    async append(path, value) {
      return this.set(path, value, true);
    }
    async set(path, value, append = false) {
      const {
        section,
        subsection,
        name,
        path: normalizedPath,
        sectionPath,
        isSection
      } = normalizePath(path);
      const configIndex = findLastIndex(this.parsedConfig, (config) => config.path === normalizedPath);
      if (value == null) {
        if (configIndex !== -1) {
          this.parsedConfig.splice(configIndex, 1);
        }
      } else {
        if (configIndex !== -1) {
          const config = this.parsedConfig[configIndex];
          const modifiedConfig = Object.assign({}, config, {
            name,
            value,
            modified: true
          });
          if (append) {
            this.parsedConfig.splice(configIndex + 1, 0, modifiedConfig);
          } else {
            this.parsedConfig[configIndex] = modifiedConfig;
          }
        } else {
          const sectionIndex = this.parsedConfig.findIndex((config) => config.path === sectionPath);
          const newConfig = {
            section,
            subsection,
            name,
            value,
            modified: true,
            path: normalizedPath
          };
          if (SECTION_REGEX.test(section) && VARIABLE_NAME_REGEX.test(name)) {
            if (sectionIndex >= 0) {
              this.parsedConfig.splice(sectionIndex + 1, 0, newConfig);
            } else {
              const newSection = {
                isSection,
                section,
                subsection,
                modified: true,
                path: sectionPath
              };
              this.parsedConfig.push(newSection, newConfig);
            }
          }
        }
      }
    }
    toString() {
      return this.parsedConfig.map(({ line, section, subsection, name, value, modified: modified2 = false }) => {
        if (!modified2) {
          return line;
        }
        if (name != null && value != null) {
          if (typeof value === "string" && /[#;]/.test(value)) {
            return `	${name} = "${value}"`;
          }
          return `	${name} = ${value}`;
        }
        if (subsection != null) {
          return `[${section} "${subsection}"]`;
        }
        return `[${section}]`;
      }).join(`
`);
    }
  }

  class GitConfigManager {
    static async get({ fs, gitdir }) {
      const text = await fs.read(`${gitdir}/config`, { encoding: "utf8" });
      return GitConfig.from(text);
    }
    static async save({ fs, gitdir, config }) {
      await fs.write(`${gitdir}/config`, config.toString(), {
        encoding: "utf8"
      });
    }
  }
  var refpaths = (ref) => [
    `${ref}`,
    `refs/${ref}`,
    `refs/tags/${ref}`,
    `refs/heads/${ref}`,
    `refs/remotes/${ref}`,
    `refs/remotes/${ref}/HEAD`
  ];
  var GIT_FILES = ["config", "description", "index", "shallow", "commondir"];
  var lock$1;
  async function acquireLock(ref, callback) {
    if (lock$1 === undefined)
      lock$1 = new AsyncLock;
    return lock$1.acquire(ref, callback);
  }

  class GitRefManager {
    static async updateRemoteRefs({
      fs,
      gitdir,
      remote,
      refs,
      symrefs,
      tags,
      refspecs = undefined,
      prune = false,
      pruneTags = false
    }) {
      for (const value of refs.values()) {
        if (!value.match(/[0-9a-f]{40}/)) {
          throw new InvalidOidError(value);
        }
      }
      const config = await GitConfigManager.get({ fs, gitdir });
      if (!refspecs) {
        refspecs = await config.getall(`remote.${remote}.fetch`);
        if (refspecs.length === 0) {
          throw new NoRefspecError(remote);
        }
        refspecs.unshift(`+HEAD:refs/remotes/${remote}/HEAD`);
      }
      const refspec = GitRefSpecSet.from(refspecs);
      const actualRefsToWrite = new Map;
      if (pruneTags) {
        const tags2 = await GitRefManager.listRefs({
          fs,
          gitdir,
          filepath: "refs/tags"
        });
        await GitRefManager.deleteRefs({
          fs,
          gitdir,
          refs: tags2.map((tag2) => `refs/tags/${tag2}`)
        });
      }
      if (tags) {
        for (const serverRef of refs.keys()) {
          if (serverRef.startsWith("refs/tags") && !serverRef.endsWith("^{}")) {
            if (!await GitRefManager.exists({ fs, gitdir, ref: serverRef })) {
              const oid = refs.get(serverRef);
              actualRefsToWrite.set(serverRef, oid);
            }
          }
        }
      }
      const refTranslations = refspec.translate([...refs.keys()]);
      for (const [serverRef, translatedRef] of refTranslations) {
        const value = refs.get(serverRef);
        actualRefsToWrite.set(translatedRef, value);
      }
      const symrefTranslations = refspec.translate([...symrefs.keys()]);
      for (const [serverRef, translatedRef] of symrefTranslations) {
        const value = symrefs.get(serverRef);
        const symtarget = refspec.translateOne(value);
        if (symtarget) {
          actualRefsToWrite.set(translatedRef, `ref: ${symtarget}`);
        }
      }
      const pruned = [];
      if (prune) {
        for (const filepath of refspec.localNamespaces()) {
          const refs2 = (await GitRefManager.listRefs({
            fs,
            gitdir,
            filepath
          })).map((file) => `${filepath}/${file}`);
          for (const ref of refs2) {
            if (!actualRefsToWrite.has(ref)) {
              pruned.push(ref);
            }
          }
        }
        if (pruned.length > 0) {
          await GitRefManager.deleteRefs({ fs, gitdir, refs: pruned });
        }
      }
      for (const [key, value] of actualRefsToWrite) {
        await acquireLock(key, async () => fs.write(join(gitdir, key), `${value.trim()}
`, "utf8"));
      }
      return { pruned };
    }
    static async writeRef({ fs, gitdir, ref, value }) {
      if (!value.match(/[0-9a-f]{40}/)) {
        throw new InvalidOidError(value);
      }
      await acquireLock(ref, async () => fs.write(join(gitdir, ref), `${value.trim()}
`, "utf8"));
    }
    static async writeSymbolicRef({ fs, gitdir, ref, value }) {
      await acquireLock(ref, async () => fs.write(join(gitdir, ref), "ref: " + `${value.trim()}
`, "utf8"));
    }
    static async deleteRef({ fs, gitdir, ref }) {
      return GitRefManager.deleteRefs({ fs, gitdir, refs: [ref] });
    }
    static async deleteRefs({ fs, gitdir, refs }) {
      await Promise.all(refs.map((ref) => fs.rm(join(gitdir, ref))));
      let text = await acquireLock("packed-refs", async () => fs.read(`${gitdir}/packed-refs`, { encoding: "utf8" }));
      const packed = GitPackedRefs.from(text);
      const beforeSize = packed.refs.size;
      for (const ref of refs) {
        if (packed.refs.has(ref)) {
          packed.delete(ref);
        }
      }
      if (packed.refs.size < beforeSize) {
        text = packed.toString();
        await acquireLock("packed-refs", async () => fs.write(`${gitdir}/packed-refs`, text, { encoding: "utf8" }));
      }
    }
    static async resolve({ fs, gitdir, ref, depth = undefined }) {
      if (depth !== undefined) {
        depth--;
        if (depth === -1) {
          return ref;
        }
      }
      if (ref.startsWith("ref: ")) {
        ref = ref.slice("ref: ".length);
        return GitRefManager.resolve({ fs, gitdir, ref, depth });
      }
      if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
        return ref;
      }
      const packedMap = await GitRefManager.packedRefs({ fs, gitdir });
      const allpaths = refpaths(ref).filter((p) => !GIT_FILES.includes(p));
      for (const ref2 of allpaths) {
        const sha = await acquireLock(ref2, async () => await fs.read(`${gitdir}/${ref2}`, { encoding: "utf8" }) || packedMap.get(ref2));
        if (sha) {
          return GitRefManager.resolve({ fs, gitdir, ref: sha.trim(), depth });
        }
      }
      throw new NotFoundError(ref);
    }
    static async exists({ fs, gitdir, ref }) {
      try {
        await GitRefManager.expand({ fs, gitdir, ref });
        return true;
      } catch (err) {
        return false;
      }
    }
    static async expand({ fs, gitdir, ref }) {
      if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
        return ref;
      }
      const packedMap = await GitRefManager.packedRefs({ fs, gitdir });
      const allpaths = refpaths(ref);
      for (const ref2 of allpaths) {
        const refExists = await acquireLock(ref2, async () => fs.exists(`${gitdir}/${ref2}`));
        if (refExists)
          return ref2;
        if (packedMap.has(ref2))
          return ref2;
      }
      throw new NotFoundError(ref);
    }
    static async expandAgainstMap({ ref, map }) {
      const allpaths = refpaths(ref);
      for (const ref2 of allpaths) {
        if (await map.has(ref2))
          return ref2;
      }
      throw new NotFoundError(ref);
    }
    static resolveAgainstMap({ ref, fullref = ref, depth = undefined, map }) {
      if (depth !== undefined) {
        depth--;
        if (depth === -1) {
          return { fullref, oid: ref };
        }
      }
      if (ref.startsWith("ref: ")) {
        ref = ref.slice("ref: ".length);
        return GitRefManager.resolveAgainstMap({ ref, fullref, depth, map });
      }
      if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
        return { fullref, oid: ref };
      }
      const allpaths = refpaths(ref);
      for (const ref2 of allpaths) {
        const sha = map.get(ref2);
        if (sha) {
          return GitRefManager.resolveAgainstMap({
            ref: sha.trim(),
            fullref: ref2,
            depth,
            map
          });
        }
      }
      throw new NotFoundError(ref);
    }
    static async packedRefs({ fs, gitdir }) {
      const text = await acquireLock("packed-refs", async () => fs.read(`${gitdir}/packed-refs`, { encoding: "utf8" }));
      const packed = GitPackedRefs.from(text);
      return packed.refs;
    }
    static async listRefs({ fs, gitdir, filepath }) {
      const packedMap = GitRefManager.packedRefs({ fs, gitdir });
      let files = null;
      try {
        files = await fs.readdirDeep(`${gitdir}/${filepath}`);
        files = files.map((x) => x.replace(`${gitdir}/${filepath}/`, ""));
      } catch (err) {
        files = [];
      }
      for (let key of (await packedMap).keys()) {
        if (key.startsWith(filepath)) {
          key = key.replace(filepath + "/", "");
          if (!files.includes(key)) {
            files.push(key);
          }
        }
      }
      files.sort(compareRefNames);
      return files;
    }
    static async listBranches({ fs, gitdir, remote }) {
      if (remote) {
        return GitRefManager.listRefs({
          fs,
          gitdir,
          filepath: `refs/remotes/${remote}`
        });
      } else {
        return GitRefManager.listRefs({ fs, gitdir, filepath: `refs/heads` });
      }
    }
    static async listTags({ fs, gitdir }) {
      const tags = await GitRefManager.listRefs({
        fs,
        gitdir,
        filepath: `refs/tags`
      });
      return tags.filter((x) => !x.endsWith("^{}"));
    }
  }
  function compareTreeEntryPath(a, b) {
    return compareStrings(appendSlashIfDir(a), appendSlashIfDir(b));
  }
  function appendSlashIfDir(entry) {
    return entry.mode === "040000" ? entry.path + "/" : entry.path;
  }
  function mode2type$1(mode) {
    switch (mode) {
      case "040000":
        return "tree";
      case "100644":
        return "blob";
      case "100755":
        return "blob";
      case "120000":
        return "blob";
      case "160000":
        return "commit";
    }
    throw new InternalError(`Unexpected GitTree entry mode: ${mode}`);
  }
  function parseBuffer(buffer) {
    const _entries = [];
    let cursor = 0;
    while (cursor < buffer.length) {
      const space = buffer.indexOf(32, cursor);
      if (space === -1) {
        throw new InternalError(`GitTree: Error parsing buffer at byte location ${cursor}: Could not find the next space character.`);
      }
      const nullchar = buffer.indexOf(0, cursor);
      if (nullchar === -1) {
        throw new InternalError(`GitTree: Error parsing buffer at byte location ${cursor}: Could not find the next null character.`);
      }
      let mode = buffer.slice(cursor, space).toString("utf8");
      if (mode === "40000")
        mode = "040000";
      const type = mode2type$1(mode);
      const path = buffer.slice(space + 1, nullchar).toString("utf8");
      if (path.includes("\\") || path.includes("/")) {
        throw new UnsafeFilepathError(path);
      }
      const oid = buffer.slice(nullchar + 1, nullchar + 21).toString("hex");
      cursor = nullchar + 21;
      _entries.push({ mode, path, oid, type });
    }
    return _entries;
  }
  function limitModeToAllowed(mode) {
    if (typeof mode === "number") {
      mode = mode.toString(8);
    }
    if (mode.match(/^0?4.*/))
      return "040000";
    if (mode.match(/^1006.*/))
      return "100644";
    if (mode.match(/^1007.*/))
      return "100755";
    if (mode.match(/^120.*/))
      return "120000";
    if (mode.match(/^160.*/))
      return "160000";
    throw new InternalError(`Could not understand file mode: ${mode}`);
  }
  function nudgeIntoShape(entry) {
    if (!entry.oid && entry.sha) {
      entry.oid = entry.sha;
    }
    entry.mode = limitModeToAllowed(entry.mode);
    if (!entry.type) {
      entry.type = mode2type$1(entry.mode);
    }
    return entry;
  }

  class GitTree {
    constructor(entries) {
      if (Buffer.isBuffer(entries)) {
        this._entries = parseBuffer(entries);
      } else if (Array.isArray(entries)) {
        this._entries = entries.map(nudgeIntoShape);
      } else {
        throw new InternalError("invalid type passed to GitTree constructor");
      }
      this._entries.sort(comparePath);
    }
    static from(tree) {
      return new GitTree(tree);
    }
    render() {
      return this._entries.map((entry) => `${entry.mode} ${entry.type} ${entry.oid}    ${entry.path}`).join(`
`);
    }
    toObject() {
      const entries = [...this._entries];
      entries.sort(compareTreeEntryPath);
      return Buffer.concat(entries.map((entry) => {
        const mode = Buffer.from(entry.mode.replace(/^0/, ""));
        const space = Buffer.from(" ");
        const path = Buffer.from(entry.path, "utf8");
        const nullchar = Buffer.from([0]);
        const oid = Buffer.from(entry.oid, "hex");
        return Buffer.concat([mode, space, path, nullchar, oid]);
      }));
    }
    entries() {
      return this._entries;
    }
    *[Symbol.iterator]() {
      for (const entry of this._entries) {
        yield entry;
      }
    }
  }

  class GitObject {
    static wrap({ type, object }) {
      const header = `${type} ${object.length}\x00`;
      const headerLen = header.length;
      const totalLength = headerLen + object.length;
      const wrappedObject = new Uint8Array(totalLength);
      for (let i = 0;i < headerLen; i++) {
        wrappedObject[i] = header.charCodeAt(i);
      }
      wrappedObject.set(object, headerLen);
      return wrappedObject;
    }
    static unwrap(buffer) {
      const s = buffer.indexOf(32);
      const i = buffer.indexOf(0);
      const type = buffer.slice(0, s).toString("utf8");
      const length = buffer.slice(s + 1, i).toString("utf8");
      const actualLength = buffer.length - (i + 1);
      if (parseInt(length) !== actualLength) {
        throw new InternalError(`Length mismatch: expected ${length} bytes but got ${actualLength} instead.`);
      }
      return {
        type,
        object: Buffer.from(buffer.slice(i + 1))
      };
    }
  }
  async function readObjectLoose({ fs, gitdir, oid }) {
    const source = `objects/${oid.slice(0, 2)}/${oid.slice(2)}`;
    const file = await fs.read(`${gitdir}/${source}`);
    if (!file) {
      return null;
    }
    return { object: file, format: "deflated", source };
  }
  function applyDelta(delta, source) {
    const reader = new BufferCursor(delta);
    const sourceSize = readVarIntLE(reader);
    if (sourceSize !== source.byteLength) {
      throw new InternalError(`applyDelta expected source buffer to be ${sourceSize} bytes but the provided buffer was ${source.length} bytes`);
    }
    const targetSize = readVarIntLE(reader);
    let target;
    const firstOp = readOp(reader, source);
    if (firstOp.byteLength === targetSize) {
      target = firstOp;
    } else {
      target = Buffer.alloc(targetSize);
      const writer = new BufferCursor(target);
      writer.copy(firstOp);
      while (!reader.eof()) {
        writer.copy(readOp(reader, source));
      }
      const tell = writer.tell();
      if (targetSize !== tell) {
        throw new InternalError(`applyDelta expected target buffer to be ${targetSize} bytes but the resulting buffer was ${tell} bytes`);
      }
    }
    return target;
  }
  function readVarIntLE(reader) {
    let result = 0;
    let shift = 0;
    let byte = null;
    do {
      byte = reader.readUInt8();
      result |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128);
    return result;
  }
  function readCompactLE(reader, flags, size) {
    let result = 0;
    let shift = 0;
    while (size--) {
      if (flags & 1) {
        result |= reader.readUInt8() << shift;
      }
      flags >>= 1;
      shift += 8;
    }
    return result;
  }
  function readOp(reader, source) {
    const byte = reader.readUInt8();
    const COPY = 128;
    const OFFS = 15;
    const SIZE = 112;
    if (byte & COPY) {
      const offset = readCompactLE(reader, byte & OFFS, 4);
      let size = readCompactLE(reader, (byte & SIZE) >> 4, 3);
      if (size === 0)
        size = 65536;
      return source.slice(offset, offset + size);
    } else {
      return reader.slice(byte);
    }
  }
  function fromValue(value) {
    let queue = [value];
    return {
      next() {
        return Promise.resolve({ done: queue.length === 0, value: queue.pop() });
      },
      return() {
        queue = [];
        return {};
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  function getIterator(iterable) {
    if (iterable[Symbol.asyncIterator]) {
      return iterable[Symbol.asyncIterator]();
    }
    if (iterable[Symbol.iterator]) {
      return iterable[Symbol.iterator]();
    }
    if (iterable.next) {
      return iterable;
    }
    return fromValue(iterable);
  }

  class StreamReader {
    constructor(stream) {
      if (typeof Buffer === "undefined") {
        throw new Error("Missing Buffer dependency");
      }
      this.stream = getIterator(stream);
      this.buffer = null;
      this.cursor = 0;
      this.undoCursor = 0;
      this.started = false;
      this._ended = false;
      this._discardedBytes = 0;
    }
    eof() {
      return this._ended && this.cursor === this.buffer.length;
    }
    tell() {
      return this._discardedBytes + this.cursor;
    }
    async byte() {
      if (this.eof())
        return;
      if (!this.started)
        await this._init();
      if (this.cursor === this.buffer.length) {
        await this._loadnext();
        if (this._ended)
          return;
      }
      this._moveCursor(1);
      return this.buffer[this.undoCursor];
    }
    async chunk() {
      if (this.eof())
        return;
      if (!this.started)
        await this._init();
      if (this.cursor === this.buffer.length) {
        await this._loadnext();
        if (this._ended)
          return;
      }
      this._moveCursor(this.buffer.length);
      return this.buffer.slice(this.undoCursor, this.cursor);
    }
    async read(n) {
      if (this.eof())
        return;
      if (!this.started)
        await this._init();
      if (this.cursor + n > this.buffer.length) {
        this._trim();
        await this._accumulate(n);
      }
      this._moveCursor(n);
      return this.buffer.slice(this.undoCursor, this.cursor);
    }
    async skip(n) {
      if (this.eof())
        return;
      if (!this.started)
        await this._init();
      if (this.cursor + n > this.buffer.length) {
        this._trim();
        await this._accumulate(n);
      }
      this._moveCursor(n);
    }
    async undo() {
      this.cursor = this.undoCursor;
    }
    async _next() {
      this.started = true;
      let { done, value } = await this.stream.next();
      if (done) {
        this._ended = true;
        if (!value)
          return Buffer.alloc(0);
      }
      if (value) {
        value = Buffer.from(value);
      }
      return value;
    }
    _trim() {
      this.buffer = this.buffer.slice(this.undoCursor);
      this.cursor -= this.undoCursor;
      this._discardedBytes += this.undoCursor;
      this.undoCursor = 0;
    }
    _moveCursor(n) {
      this.undoCursor = this.cursor;
      this.cursor += n;
      if (this.cursor > this.buffer.length) {
        this.cursor = this.buffer.length;
      }
    }
    async _accumulate(n) {
      if (this._ended)
        return;
      const buffers = [this.buffer];
      while (this.cursor + n > lengthBuffers(buffers)) {
        const nextbuffer = await this._next();
        if (this._ended)
          break;
        buffers.push(nextbuffer);
      }
      this.buffer = Buffer.concat(buffers);
    }
    async _loadnext() {
      this._discardedBytes += this.buffer.length;
      this.undoCursor = 0;
      this.cursor = 0;
      this.buffer = await this._next();
    }
    async _init() {
      this.buffer = await this._next();
    }
  }
  function lengthBuffers(buffers) {
    return buffers.reduce((acc, buffer) => acc + buffer.length, 0);
  }
  async function listpack(stream, onData) {
    const reader = new StreamReader(stream);
    let PACK = await reader.read(4);
    PACK = PACK.toString("utf8");
    if (PACK !== "PACK") {
      throw new InternalError(`Invalid PACK header '${PACK}'`);
    }
    let version2 = await reader.read(4);
    version2 = version2.readUInt32BE(0);
    if (version2 !== 2) {
      throw new InternalError(`Invalid packfile version: ${version2}`);
    }
    let numObjects = await reader.read(4);
    numObjects = numObjects.readUInt32BE(0);
    if (numObjects < 1)
      return;
    while (!reader.eof() && numObjects--) {
      const offset = reader.tell();
      const { type, length, ofs, reference } = await parseHeader(reader);
      const inflator = new pako.Inflate;
      while (!inflator.result) {
        const chunk = await reader.chunk();
        if (!chunk)
          break;
        inflator.push(chunk, false);
        if (inflator.err) {
          throw new InternalError(`Pako error: ${inflator.msg}`);
        }
        if (inflator.result) {
          if (inflator.result.length !== length) {
            throw new InternalError(`Inflated object size is different from that stated in packfile.`);
          }
          await reader.undo();
          await reader.read(chunk.length - inflator.strm.avail_in);
          const end = reader.tell();
          await onData({
            data: inflator.result,
            type,
            num: numObjects,
            offset,
            end,
            reference,
            ofs
          });
        }
      }
    }
  }
  async function parseHeader(reader) {
    let byte = await reader.byte();
    const type = byte >> 4 & 7;
    let length = byte & 15;
    if (byte & 128) {
      let shift = 4;
      do {
        byte = await reader.byte();
        length |= (byte & 127) << shift;
        shift += 7;
      } while (byte & 128);
    }
    let ofs;
    let reference;
    if (type === 6) {
      let shift = 0;
      ofs = 0;
      const bytes = [];
      do {
        byte = await reader.byte();
        ofs |= (byte & 127) << shift;
        shift += 7;
        bytes.push(byte);
      } while (byte & 128);
      reference = Buffer.from(bytes);
    }
    if (type === 7) {
      const buf = await reader.read(20);
      reference = buf;
    }
    return { type, length, ofs, reference };
  }
  var supportsDecompressionStream = false;
  async function inflate(buffer) {
    if (supportsDecompressionStream === null) {
      supportsDecompressionStream = testDecompressionStream();
    }
    return supportsDecompressionStream ? browserInflate(buffer) : pako.inflate(buffer);
  }
  async function browserInflate(buffer) {
    const ds = new DecompressionStream("deflate");
    const d = new Blob([buffer]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(d).arrayBuffer());
  }
  function testDecompressionStream() {
    try {
      const ds = new DecompressionStream("deflate");
      if (ds)
        return true;
    } catch (_) {}
    return false;
  }
  function decodeVarInt(reader) {
    const bytes = [];
    let byte = 0;
    let multibyte = 0;
    do {
      byte = reader.readUInt8();
      const lastSeven = byte & 127;
      bytes.push(lastSeven);
      multibyte = byte & 128;
    } while (multibyte);
    return bytes.reduce((a, b) => a + 1 << 7 | b, -1);
  }
  function otherVarIntDecode(reader, startWith) {
    let result = startWith;
    let shift = 4;
    let byte = null;
    do {
      byte = reader.readUInt8();
      result |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128);
    return result;
  }

  class GitPackIndex {
    constructor(stuff) {
      Object.assign(this, stuff);
      this.offsetCache = {};
    }
    static async fromIdx({ idx, getExternalRefDelta }) {
      const reader = new BufferCursor(idx);
      const magic = reader.slice(4).toString("hex");
      if (magic !== "ff744f63") {
        return;
      }
      const version2 = reader.readUInt32BE();
      if (version2 !== 2) {
        throw new InternalError(`Unable to read version ${version2} packfile IDX. (Only version 2 supported)`);
      }
      if (idx.byteLength > 2048 * 1024 * 1024) {
        throw new InternalError(`To keep implementation simple, I haven't implemented the layer 5 feature needed to support packfiles > 2GB in size.`);
      }
      reader.seek(reader.tell() + 4 * 255);
      const size = reader.readUInt32BE();
      const hashes = [];
      for (let i = 0;i < size; i++) {
        const hash = reader.slice(20).toString("hex");
        hashes[i] = hash;
      }
      reader.seek(reader.tell() + 4 * size);
      const offsets = new Map;
      for (let i = 0;i < size; i++) {
        offsets.set(hashes[i], reader.readUInt32BE());
      }
      const packfileSha = reader.slice(20).toString("hex");
      return new GitPackIndex({
        hashes,
        crcs: {},
        offsets,
        packfileSha,
        getExternalRefDelta
      });
    }
    static async fromPack({ pack, getExternalRefDelta, onProgress }) {
      const listpackTypes = {
        1: "commit",
        2: "tree",
        3: "blob",
        4: "tag",
        6: "ofs-delta",
        7: "ref-delta"
      };
      const offsetToObject = {};
      const packfileSha = pack.slice(-20).toString("hex");
      const hashes = [];
      const crcs = {};
      const offsets = new Map;
      let totalObjectCount = null;
      let lastPercent = null;
      await listpack([pack], async ({ data, type, reference, offset, num: num2 }) => {
        if (totalObjectCount === null)
          totalObjectCount = num2;
        const percent = Math.floor((totalObjectCount - num2) * 100 / totalObjectCount);
        if (percent !== lastPercent) {
          if (onProgress) {
            await onProgress({
              phase: "Receiving objects",
              loaded: totalObjectCount - num2,
              total: totalObjectCount
            });
          }
        }
        lastPercent = percent;
        type = listpackTypes[type];
        if (["commit", "tree", "blob", "tag"].includes(type)) {
          offsetToObject[offset] = {
            type,
            offset
          };
        } else if (type === "ofs-delta") {
          offsetToObject[offset] = {
            type,
            offset
          };
        } else if (type === "ref-delta") {
          offsetToObject[offset] = {
            type,
            offset
          };
        }
      });
      const offsetArray = Object.keys(offsetToObject).map(Number);
      for (const [i, start] of offsetArray.entries()) {
        const end = i + 1 === offsetArray.length ? pack.byteLength - 20 : offsetArray[i + 1];
        const o = offsetToObject[start];
        const crc = crc32.buf(pack.slice(start, end)) >>> 0;
        o.end = end;
        o.crc = crc;
      }
      const p = new GitPackIndex({
        pack: Promise.resolve(pack),
        packfileSha,
        crcs,
        hashes,
        offsets,
        getExternalRefDelta
      });
      lastPercent = null;
      let count = 0;
      const objectsByDepth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let offset in offsetToObject) {
        offset = Number(offset);
        const percent = Math.floor(count * 100 / totalObjectCount);
        if (percent !== lastPercent) {
          if (onProgress) {
            await onProgress({
              phase: "Resolving deltas",
              loaded: count,
              total: totalObjectCount
            });
          }
        }
        count++;
        lastPercent = percent;
        const o = offsetToObject[offset];
        if (o.oid)
          continue;
        try {
          p.readDepth = 0;
          p.externalReadDepth = 0;
          const { type, object } = await p.readSlice({ start: offset });
          objectsByDepth[p.readDepth] += 1;
          const oid = await shasum(GitObject.wrap({ type, object }));
          o.oid = oid;
          hashes.push(oid);
          offsets.set(oid, offset);
          crcs[oid] = o.crc;
        } catch (err) {
          continue;
        }
      }
      hashes.sort();
      return p;
    }
    async toBuffer() {
      const buffers = [];
      const write = (str, encoding) => {
        buffers.push(Buffer.from(str, encoding));
      };
      write("ff744f63", "hex");
      write("00000002", "hex");
      const fanoutBuffer = new BufferCursor(Buffer.alloc(256 * 4));
      for (let i = 0;i < 256; i++) {
        let count = 0;
        for (const hash of this.hashes) {
          if (parseInt(hash.slice(0, 2), 16) <= i)
            count++;
        }
        fanoutBuffer.writeUInt32BE(count);
      }
      buffers.push(fanoutBuffer.buffer);
      for (const hash of this.hashes) {
        write(hash, "hex");
      }
      const crcsBuffer = new BufferCursor(Buffer.alloc(this.hashes.length * 4));
      for (const hash of this.hashes) {
        crcsBuffer.writeUInt32BE(this.crcs[hash]);
      }
      buffers.push(crcsBuffer.buffer);
      const offsetsBuffer = new BufferCursor(Buffer.alloc(this.hashes.length * 4));
      for (const hash of this.hashes) {
        offsetsBuffer.writeUInt32BE(this.offsets.get(hash));
      }
      buffers.push(offsetsBuffer.buffer);
      write(this.packfileSha, "hex");
      const totalBuffer = Buffer.concat(buffers);
      const sha = await shasum(totalBuffer);
      const shaBuffer = Buffer.alloc(20);
      shaBuffer.write(sha, "hex");
      return Buffer.concat([totalBuffer, shaBuffer]);
    }
    async load({ pack }) {
      this.pack = pack;
    }
    async unload() {
      this.pack = null;
    }
    async read({ oid }) {
      if (!this.offsets.get(oid)) {
        if (this.getExternalRefDelta) {
          this.externalReadDepth++;
          return this.getExternalRefDelta(oid);
        } else {
          throw new InternalError(`Could not read object ${oid} from packfile`);
        }
      }
      const start = this.offsets.get(oid);
      return this.readSlice({ start });
    }
    async readSlice({ start }) {
      if (this.offsetCache[start]) {
        return Object.assign({}, this.offsetCache[start]);
      }
      this.readDepth++;
      const types2 = {
        16: "commit",
        32: "tree",
        48: "blob",
        64: "tag",
        96: "ofs_delta",
        112: "ref_delta"
      };
      if (!this.pack) {
        throw new InternalError("Tried to read from a GitPackIndex with no packfile loaded into memory");
      }
      const raw = (await this.pack).slice(start);
      const reader = new BufferCursor(raw);
      const byte = reader.readUInt8();
      const btype = byte & 112;
      let type = types2[btype];
      if (type === undefined) {
        throw new InternalError("Unrecognized type: 0b" + btype.toString(2));
      }
      const lastFour = byte & 15;
      let length = lastFour;
      const multibyte = byte & 128;
      if (multibyte) {
        length = otherVarIntDecode(reader, lastFour);
      }
      let base = null;
      let object = null;
      if (type === "ofs_delta") {
        const offset = decodeVarInt(reader);
        const baseOffset = start - offset;
        ({ object: base, type } = await this.readSlice({ start: baseOffset }));
      }
      if (type === "ref_delta") {
        const oid = reader.slice(20).toString("hex");
        ({ object: base, type } = await this.read({ oid }));
      }
      const buffer = raw.slice(reader.tell());
      object = Buffer.from(await inflate(buffer));
      if (object.byteLength !== length) {
        throw new InternalError(`Packfile told us object would have length ${length} but it had length ${object.byteLength}`);
      }
      if (base) {
        object = Buffer.from(applyDelta(object, base));
      }
      if (this.readDepth > 3) {
        this.offsetCache[start] = { type, object };
      }
      return { type, format: "content", object };
    }
  }
  var PackfileCache = Symbol("PackfileCache");
  async function loadPackIndex({
    fs,
    filename,
    getExternalRefDelta,
    emitter,
    emitterPrefix
  }) {
    const idx = await fs.read(filename);
    return GitPackIndex.fromIdx({ idx, getExternalRefDelta });
  }
  function readPackIndex({
    fs,
    cache,
    filename,
    getExternalRefDelta,
    emitter,
    emitterPrefix
  }) {
    if (!cache[PackfileCache])
      cache[PackfileCache] = new Map;
    let p = cache[PackfileCache].get(filename);
    if (!p) {
      p = loadPackIndex({
        fs,
        filename,
        getExternalRefDelta,
        emitter,
        emitterPrefix
      });
      cache[PackfileCache].set(filename, p);
    }
    return p;
  }
  async function readObjectPacked({
    fs,
    cache,
    gitdir,
    oid,
    format = "content",
    getExternalRefDelta
  }) {
    let list = await fs.readdir(join(gitdir, "objects/pack"));
    list = list.filter((x) => x.endsWith(".idx"));
    for (const filename of list) {
      const indexFile = `${gitdir}/objects/pack/${filename}`;
      const p = await readPackIndex({
        fs,
        cache,
        filename: indexFile,
        getExternalRefDelta
      });
      if (p.error)
        throw new InternalError(p.error);
      if (p.offsets.has(oid)) {
        if (!p.pack) {
          const packFile = indexFile.replace(/idx$/, "pack");
          p.pack = fs.read(packFile);
        }
        const result = await p.read({ oid, getExternalRefDelta });
        result.format = "content";
        result.source = `objects/pack/${filename.replace(/idx$/, "pack")}`;
        return result;
      }
    }
    return null;
  }
  async function _readObject({
    fs,
    cache,
    gitdir,
    oid,
    format = "content"
  }) {
    const getExternalRefDelta = (oid2) => _readObject({ fs, cache, gitdir, oid: oid2 });
    let result;
    if (oid === "4b825dc642cb6eb9a060e54bf8d69288fbee4904") {
      result = { format: "wrapped", object: Buffer.from(`tree 0\x00`) };
    }
    if (!result) {
      result = await readObjectLoose({ fs, gitdir, oid });
    }
    if (!result) {
      result = await readObjectPacked({
        fs,
        cache,
        gitdir,
        oid,
        getExternalRefDelta
      });
      if (!result) {
        throw new NotFoundError(oid);
      }
      return result;
    }
    if (format === "deflated") {
      return result;
    }
    if (result.format === "deflated") {
      result.object = Buffer.from(await inflate(result.object));
      result.format = "wrapped";
    }
    if (format === "wrapped") {
      return result;
    }
    const sha = await shasum(result.object);
    if (sha !== oid) {
      throw new InternalError(`SHA check failed! Expected ${oid}, computed ${sha}`);
    }
    const { object, type } = GitObject.unwrap(result.object);
    result.type = type;
    result.object = object;
    result.format = "content";
    if (format === "content") {
      return result;
    }
    throw new InternalError(`invalid requested format "${format}"`);
  }

  class AlreadyExistsError extends BaseError {
    constructor(noun, where, canForce = true) {
      super(`Failed to create ${noun} at ${where} because it already exists.${canForce ? ` (Hint: use 'force: true' parameter to overwrite existing ${noun}.)` : ""}`);
      this.code = this.name = AlreadyExistsError.code;
      this.data = { noun, where, canForce };
    }
  }
  AlreadyExistsError.code = "AlreadyExistsError";

  class AmbiguousError extends BaseError {
    constructor(nouns, short, matches) {
      super(`Found multiple ${nouns} matching "${short}" (${matches.join(", ")}). Use a longer abbreviation length to disambiguate them.`);
      this.code = this.name = AmbiguousError.code;
      this.data = { nouns, short, matches };
    }
  }
  AmbiguousError.code = "AmbiguousError";

  class CheckoutConflictError extends BaseError {
    constructor(filepaths) {
      super(`Your local changes to the following files would be overwritten by checkout: ${filepaths.join(", ")}`);
      this.code = this.name = CheckoutConflictError.code;
      this.data = { filepaths };
    }
  }
  CheckoutConflictError.code = "CheckoutConflictError";

  class CommitNotFetchedError extends BaseError {
    constructor(ref, oid) {
      super(`Failed to checkout "${ref}" because commit ${oid} is not available locally. Do a git fetch to make the branch available locally.`);
      this.code = this.name = CommitNotFetchedError.code;
      this.data = { ref, oid };
    }
  }
  CommitNotFetchedError.code = "CommitNotFetchedError";

  class EmptyServerResponseError extends BaseError {
    constructor() {
      super(`Empty response from git server.`);
      this.code = this.name = EmptyServerResponseError.code;
      this.data = {};
    }
  }
  EmptyServerResponseError.code = "EmptyServerResponseError";

  class FastForwardError extends BaseError {
    constructor() {
      super(`A simple fast-forward merge was not possible.`);
      this.code = this.name = FastForwardError.code;
      this.data = {};
    }
  }
  FastForwardError.code = "FastForwardError";

  class GitPushError extends BaseError {
    constructor(prettyDetails, result) {
      super(`One or more branches were not updated: ${prettyDetails}`);
      this.code = this.name = GitPushError.code;
      this.data = { prettyDetails, result };
    }
  }
  GitPushError.code = "GitPushError";

  class HttpError extends BaseError {
    constructor(statusCode, statusMessage, response) {
      super(`HTTP Error: ${statusCode} ${statusMessage}`);
      this.code = this.name = HttpError.code;
      this.data = { statusCode, statusMessage, response };
    }
  }
  HttpError.code = "HttpError";

  class InvalidFilepathError extends BaseError {
    constructor(reason) {
      let message = "invalid filepath";
      if (reason === "leading-slash" || reason === "trailing-slash") {
        message = `"filepath" parameter should not include leading or trailing directory separators because these can cause problems on some platforms.`;
      } else if (reason === "directory") {
        message = `"filepath" should not be a directory.`;
      }
      super(message);
      this.code = this.name = InvalidFilepathError.code;
      this.data = { reason };
    }
  }
  InvalidFilepathError.code = "InvalidFilepathError";

  class InvalidRefNameError extends BaseError {
    constructor(ref, suggestion) {
      super(`"${ref}" would be an invalid git reference. (Hint: a valid alternative would be "${suggestion}".)`);
      this.code = this.name = InvalidRefNameError.code;
      this.data = { ref, suggestion };
    }
  }
  InvalidRefNameError.code = "InvalidRefNameError";

  class MaxDepthError extends BaseError {
    constructor(depth) {
      super(`Maximum search depth of ${depth} exceeded.`);
      this.code = this.name = MaxDepthError.code;
      this.data = { depth };
    }
  }
  MaxDepthError.code = "MaxDepthError";

  class MergeNotSupportedError extends BaseError {
    constructor() {
      super(`Merges with conflicts are not supported yet.`);
      this.code = this.name = MergeNotSupportedError.code;
      this.data = {};
    }
  }
  MergeNotSupportedError.code = "MergeNotSupportedError";

  class MergeConflictError extends BaseError {
    constructor(filepaths, bothModified, deleteByUs, deleteByTheirs) {
      super(`Automatic merge failed with one or more merge conflicts in the following files: ${filepaths.toString()}. Fix conflicts then commit the result.`);
      this.code = this.name = MergeConflictError.code;
      this.data = { filepaths, bothModified, deleteByUs, deleteByTheirs };
    }
  }
  MergeConflictError.code = "MergeConflictError";

  class MissingNameError extends BaseError {
    constructor(role) {
      super(`No name was provided for ${role} in the argument or in the .git/config file.`);
      this.code = this.name = MissingNameError.code;
      this.data = { role };
    }
  }
  MissingNameError.code = "MissingNameError";

  class MissingParameterError extends BaseError {
    constructor(parameter) {
      super(`The function requires a "${parameter}" parameter but none was provided.`);
      this.code = this.name = MissingParameterError.code;
      this.data = { parameter };
    }
  }
  MissingParameterError.code = "MissingParameterError";

  class MultipleGitError extends BaseError {
    constructor(errors) {
      super(`There are multiple errors that were thrown by the method. Please refer to the "errors" property to see more`);
      this.code = this.name = MultipleGitError.code;
      this.data = { errors };
      this.errors = errors;
    }
  }
  MultipleGitError.code = "MultipleGitError";

  class ParseError extends BaseError {
    constructor(expected, actual) {
      super(`Expected "${expected}" but received "${actual}".`);
      this.code = this.name = ParseError.code;
      this.data = { expected, actual };
    }
  }
  ParseError.code = "ParseError";

  class PushRejectedError extends BaseError {
    constructor(reason) {
      let message = "";
      if (reason === "not-fast-forward") {
        message = " because it was not a simple fast-forward";
      } else if (reason === "tag-exists") {
        message = " because tag already exists";
      }
      super(`Push rejected${message}. Use "force: true" to override.`);
      this.code = this.name = PushRejectedError.code;
      this.data = { reason };
    }
  }
  PushRejectedError.code = "PushRejectedError";

  class RemoteCapabilityError extends BaseError {
    constructor(capability, parameter) {
      super(`Remote does not support the "${capability}" so the "${parameter}" parameter cannot be used.`);
      this.code = this.name = RemoteCapabilityError.code;
      this.data = { capability, parameter };
    }
  }
  RemoteCapabilityError.code = "RemoteCapabilityError";

  class SmartHttpError extends BaseError {
    constructor(preview, response) {
      super(`Remote did not reply using the "smart" HTTP protocol. Expected "001e# service=git-upload-pack" but received: ${preview}`);
      this.code = this.name = SmartHttpError.code;
      this.data = { preview, response };
    }
  }
  SmartHttpError.code = "SmartHttpError";

  class UnknownTransportError extends BaseError {
    constructor(url, transport, suggestion) {
      super(`Git remote "${url}" uses an unrecognized transport protocol: "${transport}"`);
      this.code = this.name = UnknownTransportError.code;
      this.data = { url, transport, suggestion };
    }
  }
  UnknownTransportError.code = "UnknownTransportError";

  class UrlParseError extends BaseError {
    constructor(url) {
      super(`Cannot parse remote URL: "${url}"`);
      this.code = this.name = UrlParseError.code;
      this.data = { url };
    }
  }
  UrlParseError.code = "UrlParseError";

  class UserCanceledError extends BaseError {
    constructor() {
      super(`The operation was canceled.`);
      this.code = this.name = UserCanceledError.code;
      this.data = {};
    }
  }
  UserCanceledError.code = "UserCanceledError";

  class IndexResetError extends BaseError {
    constructor(filepath) {
      super(`Could not merge index: Entry for '${filepath}' is not up to date. Either reset the index entry to HEAD, or stage your unstaged changes.`);
      this.code = this.name = IndexResetError.code;
      this.data = { filepath };
    }
  }
  IndexResetError.code = "IndexResetError";

  class NoCommitError extends BaseError {
    constructor(ref) {
      super(`"${ref}" does not point to any commit. You're maybe working on a repository with no commits yet. `);
      this.code = this.name = NoCommitError.code;
      this.data = { ref };
    }
  }
  NoCommitError.code = "NoCommitError";
  var Errors = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    AlreadyExistsError,
    AmbiguousError,
    CheckoutConflictError,
    CommitNotFetchedError,
    EmptyServerResponseError,
    FastForwardError,
    GitPushError,
    HttpError,
    InternalError,
    InvalidFilepathError,
    InvalidOidError,
    InvalidRefNameError,
    MaxDepthError,
    MergeNotSupportedError,
    MergeConflictError,
    MissingNameError,
    MissingParameterError,
    MultipleGitError,
    NoRefspecError,
    NotFoundError,
    ObjectTypeError,
    ParseError,
    PushRejectedError,
    RemoteCapabilityError,
    SmartHttpError,
    UnknownTransportError,
    UnsafeFilepathError,
    UrlParseError,
    UserCanceledError,
    UnmergedPathsError,
    IndexResetError,
    NoCommitError
  });
  function formatAuthor({ name, email, timestamp, timezoneOffset }) {
    timezoneOffset = formatTimezoneOffset(timezoneOffset);
    return `${name} <${email}> ${timestamp} ${timezoneOffset}`;
  }
  function formatTimezoneOffset(minutes) {
    const sign = simpleSign(negateExceptForZero(minutes));
    minutes = Math.abs(minutes);
    const hours = Math.floor(minutes / 60);
    minutes -= hours * 60;
    let strHours = String(hours);
    let strMinutes = String(minutes);
    if (strHours.length < 2)
      strHours = "0" + strHours;
    if (strMinutes.length < 2)
      strMinutes = "0" + strMinutes;
    return (sign === -1 ? "-" : "+") + strHours + strMinutes;
  }
  function simpleSign(n) {
    return Math.sign(n) || (Object.is(n, -0) ? -1 : 1);
  }
  function negateExceptForZero(n) {
    return n === 0 ? n : -n;
  }
  function normalizeNewlines(str) {
    str = str.replace(/\r/g, "");
    str = str.replace(/^\n+/, "");
    str = str.replace(/\n+$/, "") + `
`;
    return str;
  }
  function parseAuthor(author) {
    const [, name, email, timestamp, offset] = author.match(/^(.*) <(.*)> (.*) (.*)$/);
    return {
      name,
      email,
      timestamp: Number(timestamp),
      timezoneOffset: parseTimezoneOffset(offset)
    };
  }
  function parseTimezoneOffset(offset) {
    let [, sign, hours, minutes] = offset.match(/(\+|-)(\d\d)(\d\d)/);
    minutes = (sign === "+" ? 1 : -1) * (Number(hours) * 60 + Number(minutes));
    return negateExceptForZero$1(minutes);
  }
  function negateExceptForZero$1(n) {
    return n === 0 ? n : -n;
  }

  class GitAnnotatedTag {
    constructor(tag2) {
      if (typeof tag2 === "string") {
        this._tag = tag2;
      } else if (Buffer.isBuffer(tag2)) {
        this._tag = tag2.toString("utf8");
      } else if (typeof tag2 === "object") {
        this._tag = GitAnnotatedTag.render(tag2);
      } else {
        throw new InternalError("invalid type passed to GitAnnotatedTag constructor");
      }
    }
    static from(tag2) {
      return new GitAnnotatedTag(tag2);
    }
    static render(obj) {
      return `object ${obj.object}
type ${obj.type}
tag ${obj.tag}
tagger ${formatAuthor(obj.tagger)}

${obj.message}
${obj.gpgsig ? obj.gpgsig : ""}`;
    }
    justHeaders() {
      return this._tag.slice(0, this._tag.indexOf(`

`));
    }
    message() {
      const tag2 = this.withoutSignature();
      return tag2.slice(tag2.indexOf(`

`) + 2);
    }
    parse() {
      return Object.assign(this.headers(), {
        message: this.message(),
        gpgsig: this.gpgsig()
      });
    }
    render() {
      return this._tag;
    }
    headers() {
      const headers = this.justHeaders().split(`
`);
      const hs = [];
      for (const h of headers) {
        if (h[0] === " ") {
          hs[hs.length - 1] += `
` + h.slice(1);
        } else {
          hs.push(h);
        }
      }
      const obj = {};
      for (const h of hs) {
        const key = h.slice(0, h.indexOf(" "));
        const value = h.slice(h.indexOf(" ") + 1);
        if (Array.isArray(obj[key])) {
          obj[key].push(value);
        } else {
          obj[key] = value;
        }
      }
      if (obj.tagger) {
        obj.tagger = parseAuthor(obj.tagger);
      }
      if (obj.committer) {
        obj.committer = parseAuthor(obj.committer);
      }
      return obj;
    }
    withoutSignature() {
      const tag2 = normalizeNewlines(this._tag);
      if (tag2.indexOf(`
-----BEGIN PGP SIGNATURE-----`) === -1)
        return tag2;
      return tag2.slice(0, tag2.lastIndexOf(`
-----BEGIN PGP SIGNATURE-----`));
    }
    gpgsig() {
      if (this._tag.indexOf(`
-----BEGIN PGP SIGNATURE-----`) === -1)
        return;
      const signature = this._tag.slice(this._tag.indexOf("-----BEGIN PGP SIGNATURE-----"), this._tag.indexOf("-----END PGP SIGNATURE-----") + "-----END PGP SIGNATURE-----".length);
      return normalizeNewlines(signature);
    }
    payload() {
      return this.withoutSignature() + `
`;
    }
    toObject() {
      return Buffer.from(this._tag, "utf8");
    }
    static async sign(tag2, sign, secretKey) {
      const payload = tag2.payload();
      let { signature } = await sign({ payload, secretKey });
      signature = normalizeNewlines(signature);
      const signedTag = payload + signature;
      return GitAnnotatedTag.from(signedTag);
    }
  }
  function indent(str) {
    return str.trim().split(`
`).map((x) => " " + x).join(`
`) + `
`;
  }
  function outdent(str) {
    return str.split(`
`).map((x) => x.replace(/^ /, "")).join(`
`);
  }

  class GitCommit {
    constructor(commit2) {
      if (typeof commit2 === "string") {
        this._commit = commit2;
      } else if (Buffer.isBuffer(commit2)) {
        this._commit = commit2.toString("utf8");
      } else if (typeof commit2 === "object") {
        this._commit = GitCommit.render(commit2);
      } else {
        throw new InternalError("invalid type passed to GitCommit constructor");
      }
    }
    static fromPayloadSignature({ payload, signature }) {
      const headers = GitCommit.justHeaders(payload);
      const message = GitCommit.justMessage(payload);
      const commit2 = normalizeNewlines(headers + `
gpgsig` + indent(signature) + `
` + message);
      return new GitCommit(commit2);
    }
    static from(commit2) {
      return new GitCommit(commit2);
    }
    toObject() {
      return Buffer.from(this._commit, "utf8");
    }
    headers() {
      return this.parseHeaders();
    }
    message() {
      return GitCommit.justMessage(this._commit);
    }
    parse() {
      return Object.assign({ message: this.message() }, this.headers());
    }
    static justMessage(commit2) {
      return normalizeNewlines(commit2.slice(commit2.indexOf(`

`) + 2));
    }
    static justHeaders(commit2) {
      return commit2.slice(0, commit2.indexOf(`

`));
    }
    parseHeaders() {
      const headers = GitCommit.justHeaders(this._commit).split(`
`);
      const hs = [];
      for (const h of headers) {
        if (h[0] === " ") {
          hs[hs.length - 1] += `
` + h.slice(1);
        } else {
          hs.push(h);
        }
      }
      const obj = {
        parent: []
      };
      for (const h of hs) {
        const key = h.slice(0, h.indexOf(" "));
        const value = h.slice(h.indexOf(" ") + 1);
        if (Array.isArray(obj[key])) {
          obj[key].push(value);
        } else {
          obj[key] = value;
        }
      }
      if (obj.author) {
        obj.author = parseAuthor(obj.author);
      }
      if (obj.committer) {
        obj.committer = parseAuthor(obj.committer);
      }
      return obj;
    }
    static renderHeaders(obj) {
      let headers = "";
      if (obj.tree) {
        headers += `tree ${obj.tree}
`;
      } else {
        headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904
`;
      }
      if (obj.parent) {
        if (obj.parent.length === undefined) {
          throw new InternalError(`commit 'parent' property should be an array`);
        }
        for (const p of obj.parent) {
          headers += `parent ${p}
`;
        }
      }
      const author = obj.author;
      headers += `author ${formatAuthor(author)}
`;
      const committer = obj.committer || obj.author;
      headers += `committer ${formatAuthor(committer)}
`;
      if (obj.gpgsig) {
        headers += "gpgsig" + indent(obj.gpgsig);
      }
      return headers;
    }
    static render(obj) {
      return GitCommit.renderHeaders(obj) + `
` + normalizeNewlines(obj.message);
    }
    render() {
      return this._commit;
    }
    withoutSignature() {
      const commit2 = normalizeNewlines(this._commit);
      if (commit2.indexOf(`
gpgsig`) === -1)
        return commit2;
      const headers = commit2.slice(0, commit2.indexOf(`
gpgsig`));
      const message = commit2.slice(commit2.indexOf(`-----END PGP SIGNATURE-----
`) + `-----END PGP SIGNATURE-----
`.length);
      return normalizeNewlines(headers + `
` + message);
    }
    isolateSignature() {
      const signature = this._commit.slice(this._commit.indexOf("-----BEGIN PGP SIGNATURE-----"), this._commit.indexOf("-----END PGP SIGNATURE-----") + "-----END PGP SIGNATURE-----".length);
      return outdent(signature);
    }
    static async sign(commit2, sign, secretKey) {
      const payload = commit2.withoutSignature();
      const message = GitCommit.justMessage(commit2._commit);
      let { signature } = await sign({ payload, secretKey });
      signature = normalizeNewlines(signature);
      const headers = GitCommit.justHeaders(commit2._commit);
      const signedCommit = headers + `
` + "gpgsig" + indent(signature) + `
` + message;
      return GitCommit.from(signedCommit);
    }
  }
  async function resolveTree({ fs, cache, gitdir, oid }) {
    if (oid === "4b825dc642cb6eb9a060e54bf8d69288fbee4904") {
      return { tree: GitTree.from([]), oid };
    }
    const { type, object } = await _readObject({ fs, cache, gitdir, oid });
    if (type === "tag") {
      oid = GitAnnotatedTag.from(object).parse().object;
      return resolveTree({ fs, cache, gitdir, oid });
    }
    if (type === "commit") {
      oid = GitCommit.from(object).parse().tree;
      return resolveTree({ fs, cache, gitdir, oid });
    }
    if (type !== "tree") {
      throw new ObjectTypeError(oid, type, "tree");
    }
    return { tree: GitTree.from(object), oid };
  }

  class GitWalkerRepo {
    constructor({ fs, gitdir, ref, cache }) {
      this.fs = fs;
      this.cache = cache;
      this.gitdir = gitdir;
      this.mapPromise = (async () => {
        const map = new Map;
        let oid;
        try {
          oid = await GitRefManager.resolve({ fs, gitdir, ref });
        } catch (e) {
          if (e instanceof NotFoundError) {
            oid = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
          }
        }
        const tree = await resolveTree({ fs, cache: this.cache, gitdir, oid });
        tree.type = "tree";
        tree.mode = "40000";
        map.set(".", tree);
        return map;
      })();
      const walker = this;
      this.ConstructEntry = class TreeEntry {
        constructor(fullpath) {
          this._fullpath = fullpath;
          this._type = false;
          this._mode = false;
          this._stat = false;
          this._content = false;
          this._oid = false;
        }
        async type() {
          return walker.type(this);
        }
        async mode() {
          return walker.mode(this);
        }
        async stat() {
          return walker.stat(this);
        }
        async content() {
          return walker.content(this);
        }
        async oid() {
          return walker.oid(this);
        }
      };
    }
    async readdir(entry) {
      const filepath = entry._fullpath;
      const { fs, cache, gitdir } = this;
      const map = await this.mapPromise;
      const obj = map.get(filepath);
      if (!obj)
        throw new Error(`No obj for ${filepath}`);
      const oid = obj.oid;
      if (!oid)
        throw new Error(`No oid for obj ${JSON.stringify(obj)}`);
      if (obj.type !== "tree") {
        return null;
      }
      const { type, object } = await _readObject({ fs, cache, gitdir, oid });
      if (type !== obj.type) {
        throw new ObjectTypeError(oid, type, obj.type);
      }
      const tree = GitTree.from(object);
      for (const entry2 of tree) {
        map.set(join(filepath, entry2.path), entry2);
      }
      return tree.entries().map((entry2) => join(filepath, entry2.path));
    }
    async type(entry) {
      if (entry._type === false) {
        const map = await this.mapPromise;
        const { type } = map.get(entry._fullpath);
        entry._type = type;
      }
      return entry._type;
    }
    async mode(entry) {
      if (entry._mode === false) {
        const map = await this.mapPromise;
        const { mode } = map.get(entry._fullpath);
        entry._mode = normalizeMode(parseInt(mode, 8));
      }
      return entry._mode;
    }
    async stat(_entry) {}
    async content(entry) {
      if (entry._content === false) {
        const map = await this.mapPromise;
        const { fs, cache, gitdir } = this;
        const obj = map.get(entry._fullpath);
        const oid = obj.oid;
        const { type, object } = await _readObject({ fs, cache, gitdir, oid });
        if (type !== "blob") {
          entry._content = undefined;
        } else {
          entry._content = new Uint8Array(object);
        }
      }
      return entry._content;
    }
    async oid(entry) {
      if (entry._oid === false) {
        const map = await this.mapPromise;
        const obj = map.get(entry._fullpath);
        entry._oid = obj.oid;
      }
      return entry._oid;
    }
  }
  function TREE({ ref = "HEAD" } = {}) {
    const o = Object.create(null);
    Object.defineProperty(o, GitWalkSymbol, {
      value: function({ fs, gitdir, cache }) {
        return new GitWalkerRepo({ fs, gitdir, ref, cache });
      }
    });
    Object.freeze(o);
    return o;
  }

  class GitWalkerFs {
    constructor({ fs, dir, gitdir, cache }) {
      this.fs = fs;
      this.cache = cache;
      this.dir = dir;
      this.gitdir = gitdir;
      this.config = null;
      const walker = this;
      this.ConstructEntry = class WorkdirEntry {
        constructor(fullpath) {
          this._fullpath = fullpath;
          this._type = false;
          this._mode = false;
          this._stat = false;
          this._content = false;
          this._oid = false;
        }
        async type() {
          return walker.type(this);
        }
        async mode() {
          return walker.mode(this);
        }
        async stat() {
          return walker.stat(this);
        }
        async content() {
          return walker.content(this);
        }
        async oid() {
          return walker.oid(this);
        }
      };
    }
    async readdir(entry) {
      const filepath = entry._fullpath;
      const { fs, dir } = this;
      const names = await fs.readdir(join(dir, filepath));
      if (names === null)
        return null;
      return names.map((name) => join(filepath, name));
    }
    async type(entry) {
      if (entry._type === false) {
        await entry.stat();
      }
      return entry._type;
    }
    async mode(entry) {
      if (entry._mode === false) {
        await entry.stat();
      }
      return entry._mode;
    }
    async stat(entry) {
      if (entry._stat === false) {
        const { fs, dir } = this;
        let stat = await fs.lstat(`${dir}/${entry._fullpath}`);
        if (!stat) {
          throw new Error(`ENOENT: no such file or directory, lstat '${entry._fullpath}'`);
        }
        let type = stat.isDirectory() ? "tree" : "blob";
        if (type === "blob" && !stat.isFile() && !stat.isSymbolicLink()) {
          type = "special";
        }
        entry._type = type;
        stat = normalizeStats(stat);
        entry._mode = stat.mode;
        if (stat.size === -1 && entry._actualSize) {
          stat.size = entry._actualSize;
        }
        entry._stat = stat;
      }
      return entry._stat;
    }
    async content(entry) {
      if (entry._content === false) {
        const { fs, dir, gitdir } = this;
        if (await entry.type() === "tree") {
          entry._content = undefined;
        } else {
          const config = await this._getGitConfig(fs, gitdir);
          const autocrlf = await config.get("core.autocrlf");
          const content = await fs.read(`${dir}/${entry._fullpath}`, { autocrlf });
          entry._actualSize = content.length;
          if (entry._stat && entry._stat.size === -1) {
            entry._stat.size = entry._actualSize;
          }
          entry._content = new Uint8Array(content);
        }
      }
      return entry._content;
    }
    async oid(entry) {
      if (entry._oid === false) {
        const self = this;
        const { fs, gitdir, cache } = this;
        let oid;
        await GitIndexManager.acquire({ fs, gitdir, cache }, async function(index2) {
          const stage = index2.entriesMap.get(entry._fullpath);
          const stats = await entry.stat();
          const config = await self._getGitConfig(fs, gitdir);
          const filemode = await config.get("core.filemode");
          const trustino = typeof process !== "undefined" ? !(process.platform === "win32") : true;
          if (!stage || compareStats(stats, stage, filemode, trustino)) {
            const content = await entry.content();
            if (content === undefined) {
              oid = undefined;
            } else {
              oid = await shasum(GitObject.wrap({ type: "blob", object: content }));
              if (stage && oid === stage.oid && (!filemode || stats.mode === stage.mode) && compareStats(stats, stage, filemode, trustino)) {
                index2.insert({
                  filepath: entry._fullpath,
                  stats,
                  oid
                });
              }
            }
          } else {
            oid = stage.oid;
          }
        });
        entry._oid = oid;
      }
      return entry._oid;
    }
    async _getGitConfig(fs, gitdir) {
      if (this.config) {
        return this.config;
      }
      this.config = await GitConfigManager.get({ fs, gitdir });
      return this.config;
    }
  }
  function WORKDIR() {
    const o = Object.create(null);
    Object.defineProperty(o, GitWalkSymbol, {
      value: function({ fs, dir, gitdir, cache }) {
        return new GitWalkerFs({ fs, dir, gitdir, cache });
      }
    });
    Object.freeze(o);
    return o;
  }
  function arrayRange(start, end) {
    const length = end - start;
    return Array.from({ length }, (_, i) => start + i);
  }
  var flat = typeof Array.prototype.flat === "undefined" ? (entries) => entries.reduce((acc, x) => acc.concat(x), []) : (entries) => entries.flat();

  class RunningMinimum {
    constructor() {
      this.value = null;
    }
    consider(value) {
      if (value === null || value === undefined)
        return;
      if (this.value === null) {
        this.value = value;
      } else if (value < this.value) {
        this.value = value;
      }
    }
    reset() {
      this.value = null;
    }
  }
  function* unionOfIterators(sets) {
    const min = new RunningMinimum;
    let minimum;
    const heads = [];
    const numsets = sets.length;
    for (let i = 0;i < numsets; i++) {
      heads[i] = sets[i].next().value;
      if (heads[i] !== undefined) {
        min.consider(heads[i]);
      }
    }
    if (min.value === null)
      return;
    while (true) {
      const result = [];
      minimum = min.value;
      min.reset();
      for (let i = 0;i < numsets; i++) {
        if (heads[i] !== undefined && heads[i] === minimum) {
          result[i] = heads[i];
          heads[i] = sets[i].next().value;
        } else {
          result[i] = null;
        }
        if (heads[i] !== undefined) {
          min.consider(heads[i]);
        }
      }
      yield result;
      if (min.value === null)
        return;
    }
  }
  async function _walk({
    fs,
    cache,
    dir,
    gitdir,
    trees,
    map = async (_, entry) => entry,
    reduce = async (parent, children) => {
      const flatten = flat(children);
      if (parent !== undefined)
        flatten.unshift(parent);
      return flatten;
    },
    iterate = (walk2, children) => Promise.all([...children].map(walk2))
  }) {
    const walkers = trees.map((proxy) => proxy[GitWalkSymbol]({ fs, dir, gitdir, cache }));
    const root = new Array(walkers.length).fill(".");
    const range = arrayRange(0, walkers.length);
    const unionWalkerFromReaddir = async (entries) => {
      range.forEach((i) => {
        const entry = entries[i];
        entries[i] = entry && new walkers[i].ConstructEntry(entry);
      });
      const subdirs = await Promise.all(range.map((i) => {
        const entry = entries[i];
        return entry ? walkers[i].readdir(entry) : [];
      }));
      const iterators = subdirs.map((array) => {
        return (array === null ? [] : array)[Symbol.iterator]();
      });
      return {
        entries,
        children: unionOfIterators(iterators)
      };
    };
    const walk2 = async (root2) => {
      const { entries, children } = await unionWalkerFromReaddir(root2);
      const fullpath = entries.find((entry) => entry && entry._fullpath)._fullpath;
      const parent = await map(fullpath, entries);
      if (parent !== null) {
        let walkedChildren = await iterate(walk2, children);
        walkedChildren = walkedChildren.filter((x) => x !== undefined);
        return reduce(parent, walkedChildren);
      }
    };
    return walk2(root);
  }
  async function rmRecursive(fs, filepath) {
    const entries = await fs.readdir(filepath);
    if (entries == null) {
      await fs.rm(filepath);
    } else if (entries.length) {
      await Promise.all(entries.map((entry) => {
        const subpath = join(filepath, entry);
        return fs.lstat(subpath).then((stat) => {
          if (!stat)
            return;
          return stat.isDirectory() ? rmRecursive(fs, subpath) : fs.rm(subpath);
        });
      })).then(() => fs.rmdir(filepath));
    } else {
      await fs.rmdir(filepath);
    }
  }
  function isPromiseLike(obj) {
    return isObject(obj) && isFunction(obj.then) && isFunction(obj.catch);
  }
  function isObject(obj) {
    return obj && typeof obj === "object";
  }
  function isFunction(obj) {
    return typeof obj === "function";
  }
  function isPromiseFs(fs) {
    const test = (targetFs) => {
      try {
        return targetFs.readFile().catch((e) => e);
      } catch (e) {
        return e;
      }
    };
    return isPromiseLike(test(fs));
  }
  var commands = [
    "cp",
    "readFile",
    "writeFile",
    "mkdir",
    "rmdir",
    "unlink",
    "stat",
    "lstat",
    "readdir",
    "readlink",
    "symlink"
  ];
  function bindFs(target, fs) {
    if (isPromiseFs(fs)) {
      for (const command of commands) {
        target[`_${command}`] = fs[command].bind(fs);
      }
    } else {
      for (const command of commands) {
        target[`_${command}`] = pify(fs[command].bind(fs));
      }
    }
    if (isPromiseFs(fs)) {
      if (fs.rm)
        target._rm = fs.rm.bind(fs);
      else if (fs.rmdir.length > 1)
        target._rm = fs.rmdir.bind(fs);
      else
        target._rm = rmRecursive.bind(null, target);
    } else {
      if (fs.rm)
        target._rm = pify(fs.rm.bind(fs));
      else if (fs.rmdir.length > 2)
        target._rm = pify(fs.rmdir.bind(fs));
      else
        target._rm = rmRecursive.bind(null, target);
    }
  }

  class FileSystem {
    constructor(fs) {
      if (typeof fs._original_unwrapped_fs !== "undefined")
        return fs;
      const promises = Object.getOwnPropertyDescriptor(fs, "promises");
      if (promises && promises.enumerable) {
        bindFs(this, fs.promises);
      } else {
        bindFs(this, fs);
      }
      this._original_unwrapped_fs = fs;
    }
    async exists(filepath, options = {}) {
      try {
        await this._stat(filepath);
        return true;
      } catch (err) {
        if (err.code === "ENOENT" || err.code === "ENOTDIR" || (err.code || "").includes("ENS")) {
          return false;
        } else {
          console.log('Unhandled error in "FileSystem.exists()" function', err);
          throw err;
        }
      }
    }
    async read(filepath, options = {}) {
      try {
        let buffer = await this._readFile(filepath, options);
        if (options.autocrlf === "true") {
          try {
            buffer = new TextDecoder("utf8", { fatal: true }).decode(buffer);
            buffer = buffer.replace(/\r\n/g, `
`);
            buffer = new TextEncoder().encode(buffer);
          } catch (error) {}
        }
        if (typeof buffer !== "string") {
          buffer = Buffer.from(buffer);
        }
        return buffer;
      } catch (err) {
        return null;
      }
    }
    async write(filepath, contents, options = {}) {
      try {
        await this._writeFile(filepath, contents, options);
      } catch (err) {
        await this.mkdir(dirname(filepath));
        await this._writeFile(filepath, contents, options);
      }
    }
    async mkdir(filepath, _selfCall = false) {
      try {
        await this._mkdir(filepath);
      } catch (err) {
        if (err === null)
          return;
        if (err.code === "EEXIST")
          return;
        if (_selfCall)
          throw err;
        if (err.code === "ENOENT") {
          const parent = dirname(filepath);
          if (parent === "." || parent === "/" || parent === filepath)
            throw err;
          await this.mkdir(parent);
          await this.mkdir(filepath, true);
        }
      }
    }
    async rm(filepath) {
      try {
        await this._unlink(filepath);
      } catch (err) {
        if (err.code !== "ENOENT")
          throw err;
      }
    }
    async rmdir(filepath, opts) {
      try {
        if (opts && opts.recursive) {
          await this._rm(filepath, opts);
        } else {
          await this._rmdir(filepath);
        }
      } catch (err) {
        if (err.code !== "ENOENT")
          throw err;
      }
    }
    async readdir(filepath) {
      try {
        const names = await this._readdir(filepath);
        names.sort(compareStrings);
        return names;
      } catch (err) {
        if (err.code === "ENOTDIR")
          return null;
        return [];
      }
    }
    async readdirDeep(dir) {
      const subdirs = await this._readdir(dir);
      const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = dir + "/" + subdir;
        return (await this._stat(res)).isDirectory() ? this.readdirDeep(res) : res;
      }));
      return files.reduce((a, f) => a.concat(f), []);
    }
    async lstat(filename) {
      try {
        const stats = await this._lstat(filename);
        return stats;
      } catch (err) {
        if (err.code === "ENOENT" || (err.code || "").includes("ENS")) {
          return null;
        }
        throw err;
      }
    }
    async readlink(filename, opts = { encoding: "buffer" }) {
      try {
        const link = await this._readlink(filename, opts);
        return Buffer.isBuffer(link) ? link : Buffer.from(link);
      } catch (err) {
        if (err.code === "ENOENT" || (err.code || "").includes("ENS")) {
          return null;
        }
        throw err;
      }
    }
    async writelink(filename, buffer) {
      return this._symlink(buffer.toString("utf8"), filename);
    }
  }
  function assertParameter(name, value) {
    if (value === undefined) {
      throw new MissingParameterError(name);
    }
  }
  async function discoverGitdir({ fsp, dotgit }) {
    assertParameter("fsp", fsp);
    assertParameter("dotgit", dotgit);
    const dotgitStat = await fsp._stat(dotgit).catch(() => ({ isFile: () => false, isDirectory: () => false }));
    if (dotgitStat.isDirectory()) {
      return dotgit;
    } else if (dotgitStat.isFile()) {
      return fsp._readFile(dotgit, "utf8").then((contents) => contents.trimRight().substr(8)).then((submoduleGitdir) => {
        const gitdir = join(dirname(dotgit), submoduleGitdir);
        return gitdir;
      });
    } else {
      return dotgit;
    }
  }
  async function modified(entry, base) {
    if (!entry && !base)
      return false;
    if (entry && !base)
      return true;
    if (!entry && base)
      return true;
    if (await entry.type() === "tree" && await base.type() === "tree") {
      return false;
    }
    if (await entry.type() === await base.type() && await entry.mode() === await base.mode() && await entry.oid() === await base.oid()) {
      return false;
    }
    return true;
  }
  async function abortMerge({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    commit: commit2 = "HEAD",
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("dir", dir);
      assertParameter("gitdir", gitdir);
      const fs = new FileSystem(_fs);
      const trees = [TREE({ ref: commit2 }), WORKDIR(), STAGE()];
      let unmergedPaths = [];
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
        unmergedPaths = index2.unmergedPaths;
      });
      const results = await _walk({
        fs,
        cache,
        dir,
        gitdir: updatedGitdir,
        trees,
        map: async function(path, [head, workdir, index2]) {
          const staged = !await modified(workdir, index2);
          const unmerged = unmergedPaths.includes(path);
          const unmodified = !await modified(index2, head);
          if (staged || unmerged) {
            return head ? {
              path,
              mode: await head.mode(),
              oid: await head.oid(),
              type: await head.type(),
              content: await head.content()
            } : undefined;
          }
          if (unmodified)
            return false;
          else
            throw new IndexResetError(path);
        }
      });
      await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
        for (const entry of results) {
          if (entry === false)
            continue;
          if (!entry) {
            await fs.rmdir(`${dir}/${entry.path}`, { recursive: true });
            index2.delete({ filepath: entry.path });
            continue;
          }
          if (entry.type === "blob") {
            const content = new TextDecoder().decode(entry.content);
            await fs.write(`${dir}/${entry.path}`, content, {
              mode: entry.mode
            });
            index2.insert({
              filepath: entry.path,
              oid: entry.oid,
              stage: 0
            });
          }
        }
      });
    } catch (err) {
      err.caller = "git.abortMerge";
      throw err;
    }
  }

  class GitIgnoreManager {
    static async isIgnored({ fs, dir, gitdir = join(dir, ".git"), filepath }) {
      if (basename(filepath) === ".git")
        return true;
      if (filepath === ".")
        return false;
      let excludes = "";
      const excludesFile = join(gitdir, "info", "exclude");
      if (await fs.exists(excludesFile)) {
        excludes = await fs.read(excludesFile, "utf8");
      }
      const pairs = [
        {
          gitignore: join(dir, ".gitignore"),
          filepath
        }
      ];
      const pieces = filepath.split("/").filter(Boolean);
      for (let i = 1;i < pieces.length; i++) {
        const folder = pieces.slice(0, i).join("/");
        const file = pieces.slice(i).join("/");
        pairs.push({
          gitignore: join(dir, folder, ".gitignore"),
          filepath: file
        });
      }
      let ignoredStatus = false;
      for (const p of pairs) {
        let file;
        try {
          file = await fs.read(p.gitignore, "utf8");
        } catch (err) {
          if (err.code === "NOENT")
            continue;
        }
        const ign = ignore().add(excludes);
        ign.add(file);
        const parentdir = dirname(p.filepath);
        if (parentdir !== "." && ign.ignores(parentdir))
          return true;
        if (ignoredStatus) {
          ignoredStatus = !ign.test(p.filepath).unignored;
        } else {
          ignoredStatus = ign.test(p.filepath).ignored;
        }
      }
      return ignoredStatus;
    }
  }
  async function writeObjectLoose({ fs, gitdir, object, format, oid }) {
    if (format !== "deflated") {
      throw new InternalError("GitObjectStoreLoose expects objects to write to be in deflated format");
    }
    const source = `objects/${oid.slice(0, 2)}/${oid.slice(2)}`;
    const filepath = `${gitdir}/${source}`;
    if (!await fs.exists(filepath))
      await fs.write(filepath, object);
  }
  var supportsCompressionStream = null;
  async function deflate(buffer) {
    if (supportsCompressionStream === null) {
      supportsCompressionStream = testCompressionStream();
    }
    return supportsCompressionStream ? browserDeflate(buffer) : pako.deflate(buffer);
  }
  async function browserDeflate(buffer) {
    const cs = new CompressionStream("deflate");
    const c = new Blob([buffer]).stream().pipeThrough(cs);
    return new Uint8Array(await new Response(c).arrayBuffer());
  }
  function testCompressionStream() {
    try {
      const cs = new CompressionStream("deflate");
      cs.writable.close();
      const stream = new Blob([]).stream();
      stream.cancel();
      return true;
    } catch (_) {
      return false;
    }
  }
  async function _writeObject({
    fs,
    gitdir,
    type,
    object,
    format = "content",
    oid = undefined,
    dryRun = false
  }) {
    if (format !== "deflated") {
      if (format !== "wrapped") {
        object = GitObject.wrap({ type, object });
      }
      oid = await shasum(object);
      object = Buffer.from(await deflate(object));
    }
    if (!dryRun) {
      await writeObjectLoose({ fs, gitdir, object, format: "deflated", oid });
    }
    return oid;
  }
  function posixifyPathBuffer(buffer) {
    let idx;
    while (~(idx = buffer.indexOf(92)))
      buffer[idx] = 47;
    return buffer;
  }
  async function add({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath,
    cache = {},
    force = false,
    parallel = true
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("dir", dir);
      assertParameter("gitdir", gitdir);
      assertParameter("filepath", filepath);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async (index2) => {
        const config = await GitConfigManager.get({ fs, gitdir: updatedGitdir });
        const autocrlf = await config.get("core.autocrlf");
        return addToIndex({
          dir,
          gitdir: updatedGitdir,
          fs,
          filepath,
          index: index2,
          force,
          parallel,
          autocrlf
        });
      });
    } catch (err) {
      err.caller = "git.add";
      throw err;
    }
  }
  async function addToIndex({
    dir,
    gitdir,
    fs,
    filepath,
    index: index2,
    force,
    parallel,
    autocrlf
  }) {
    filepath = Array.isArray(filepath) ? filepath : [filepath];
    const promises = filepath.map(async (currentFilepath) => {
      if (!force) {
        const ignored = await GitIgnoreManager.isIgnored({
          fs,
          dir,
          gitdir,
          filepath: currentFilepath
        });
        if (ignored)
          return;
      }
      const stats = await fs.lstat(join(dir, currentFilepath));
      if (!stats)
        throw new NotFoundError(currentFilepath);
      if (stats.isDirectory()) {
        const children = await fs.readdir(join(dir, currentFilepath));
        if (parallel) {
          const promises2 = children.map((child) => addToIndex({
            dir,
            gitdir,
            fs,
            filepath: [join(currentFilepath, child)],
            index: index2,
            force,
            parallel,
            autocrlf
          }));
          await Promise.all(promises2);
        } else {
          for (const child of children) {
            await addToIndex({
              dir,
              gitdir,
              fs,
              filepath: [join(currentFilepath, child)],
              index: index2,
              force,
              parallel,
              autocrlf
            });
          }
        }
      } else {
        const object = stats.isSymbolicLink() ? await fs.readlink(join(dir, currentFilepath)).then(posixifyPathBuffer) : await fs.read(join(dir, currentFilepath), { autocrlf });
        if (object === null)
          throw new NotFoundError(currentFilepath);
        const oid = await _writeObject({ fs, gitdir, type: "blob", object });
        index2.insert({ filepath: currentFilepath, stats, oid });
      }
    });
    const settledPromises = await Promise.allSettled(promises);
    const rejectedPromises = settledPromises.filter((settle) => settle.status === "rejected").map((settle) => settle.reason);
    if (rejectedPromises.length > 1) {
      throw new MultipleGitError(rejectedPromises);
    }
    if (rejectedPromises.length === 1) {
      throw rejectedPromises[0];
    }
    const fulfilledPromises = settledPromises.filter((settle) => settle.status === "fulfilled" && settle.value).map((settle) => settle.value);
    return fulfilledPromises;
  }
  async function _getConfig({ fs, gitdir, path }) {
    const config = await GitConfigManager.get({ fs, gitdir });
    return config.get(path);
  }
  function assignDefined(target, ...sources) {
    for (const source of sources) {
      if (source) {
        for (const key of Object.keys(source)) {
          const val = source[key];
          if (val !== undefined) {
            target[key] = val;
          }
        }
      }
    }
    return target;
  }
  async function normalizeAuthorObject({ fs, gitdir, author, commit: commit2 }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const defaultAuthor = {
      name: await _getConfig({ fs, gitdir, path: "user.name" }),
      email: await _getConfig({ fs, gitdir, path: "user.email" }) || "",
      timestamp,
      timezoneOffset: new Date(timestamp * 1000).getTimezoneOffset()
    };
    const normalizedAuthor = assignDefined({}, defaultAuthor, commit2 ? commit2.author : undefined, author);
    if (normalizedAuthor.name === undefined) {
      return;
    }
    return normalizedAuthor;
  }
  async function normalizeCommitterObject({
    fs,
    gitdir,
    author,
    committer,
    commit: commit2
  }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const defaultCommitter = {
      name: await _getConfig({ fs, gitdir, path: "user.name" }),
      email: await _getConfig({ fs, gitdir, path: "user.email" }) || "",
      timestamp,
      timezoneOffset: new Date(timestamp * 1000).getTimezoneOffset()
    };
    const normalizedCommitter = assignDefined({}, defaultCommitter, commit2 ? commit2.committer : undefined, author, committer);
    if (normalizedCommitter.name === undefined) {
      return;
    }
    return normalizedCommitter;
  }
  async function resolveCommit({ fs, cache, gitdir, oid }) {
    const { type, object } = await _readObject({ fs, cache, gitdir, oid });
    if (type === "tag") {
      oid = GitAnnotatedTag.from(object).parse().object;
      return resolveCommit({ fs, cache, gitdir, oid });
    }
    if (type !== "commit") {
      throw new ObjectTypeError(oid, type, "commit");
    }
    return { commit: GitCommit.from(object), oid };
  }
  async function _readCommit({ fs, cache, gitdir, oid }) {
    const { commit: commit2, oid: commitOid } = await resolveCommit({
      fs,
      cache,
      gitdir,
      oid
    });
    const result = {
      oid: commitOid,
      commit: commit2.parse(),
      payload: commit2.withoutSignature()
    };
    return result;
  }
  async function _commit({
    fs,
    cache,
    onSign,
    gitdir,
    message,
    author: _author,
    committer: _committer,
    signingKey,
    amend = false,
    dryRun = false,
    noUpdateBranch = false,
    ref,
    parent,
    tree
  }) {
    let initialCommit = false;
    if (!ref) {
      ref = await GitRefManager.resolve({
        fs,
        gitdir,
        ref: "HEAD",
        depth: 2
      });
    }
    let refOid, refCommit;
    try {
      refOid = await GitRefManager.resolve({
        fs,
        gitdir,
        ref
      });
      refCommit = await _readCommit({ fs, gitdir, oid: refOid, cache: {} });
    } catch {
      initialCommit = true;
    }
    if (amend && initialCommit) {
      throw new NoCommitError(ref);
    }
    const author = !amend ? await normalizeAuthorObject({ fs, gitdir, author: _author }) : await normalizeAuthorObject({
      fs,
      gitdir,
      author: _author,
      commit: refCommit.commit
    });
    if (!author)
      throw new MissingNameError("author");
    const committer = !amend ? await normalizeCommitterObject({
      fs,
      gitdir,
      author,
      committer: _committer
    }) : await normalizeCommitterObject({
      fs,
      gitdir,
      author,
      committer: _committer,
      commit: refCommit.commit
    });
    if (!committer)
      throw new MissingNameError("committer");
    return GitIndexManager.acquire({ fs, gitdir, cache, allowUnmerged: false }, async function(index2) {
      const inodes = flatFileListToDirectoryStructure(index2.entries);
      const inode = inodes.get(".");
      if (!tree) {
        tree = await constructTree({ fs, gitdir, inode, dryRun });
      }
      if (!parent) {
        if (!amend) {
          parent = refOid ? [refOid] : [];
        } else {
          parent = refCommit.commit.parent;
        }
      } else {
        parent = await Promise.all(parent.map((p) => {
          return GitRefManager.resolve({ fs, gitdir, ref: p });
        }));
      }
      if (!message) {
        if (!amend) {
          throw new MissingParameterError("message");
        } else {
          message = refCommit.commit.message;
        }
      }
      let comm = GitCommit.from({
        tree,
        parent,
        author,
        committer,
        message
      });
      if (signingKey) {
        comm = await GitCommit.sign(comm, onSign, signingKey);
      }
      const oid = await _writeObject({
        fs,
        gitdir,
        type: "commit",
        object: comm.toObject(),
        dryRun
      });
      if (!noUpdateBranch && !dryRun) {
        await GitRefManager.writeRef({
          fs,
          gitdir,
          ref,
          value: oid
        });
      }
      return oid;
    });
  }
  async function constructTree({ fs, gitdir, inode, dryRun }) {
    const children = inode.children;
    for (const inode2 of children) {
      if (inode2.type === "tree") {
        inode2.metadata.mode = "040000";
        inode2.metadata.oid = await constructTree({ fs, gitdir, inode: inode2, dryRun });
      }
    }
    const entries = children.map((inode2) => ({
      mode: inode2.metadata.mode,
      path: inode2.basename,
      oid: inode2.metadata.oid,
      type: inode2.type
    }));
    const tree = GitTree.from(entries);
    const oid = await _writeObject({
      fs,
      gitdir,
      type: "tree",
      object: tree.toObject(),
      dryRun
    });
    return oid;
  }
  async function resolveFilepath({ fs, cache, gitdir, oid, filepath }) {
    if (filepath.startsWith("/")) {
      throw new InvalidFilepathError("leading-slash");
    } else if (filepath.endsWith("/")) {
      throw new InvalidFilepathError("trailing-slash");
    }
    const _oid = oid;
    const result = await resolveTree({ fs, cache, gitdir, oid });
    const tree = result.tree;
    if (filepath === "") {
      oid = result.oid;
    } else {
      const pathArray = filepath.split("/");
      oid = await _resolveFilepath({
        fs,
        cache,
        gitdir,
        tree,
        pathArray,
        oid: _oid,
        filepath
      });
    }
    return oid;
  }
  async function _resolveFilepath({
    fs,
    cache,
    gitdir,
    tree,
    pathArray,
    oid,
    filepath
  }) {
    const name = pathArray.shift();
    for (const entry of tree) {
      if (entry.path === name) {
        if (pathArray.length === 0) {
          return entry.oid;
        } else {
          const { type, object } = await _readObject({
            fs,
            cache,
            gitdir,
            oid: entry.oid
          });
          if (type !== "tree") {
            throw new ObjectTypeError(oid, type, "tree", filepath);
          }
          tree = GitTree.from(object);
          return _resolveFilepath({
            fs,
            cache,
            gitdir,
            tree,
            pathArray,
            oid,
            filepath
          });
        }
      }
    }
    throw new NotFoundError(`file or directory found at "${oid}:${filepath}"`);
  }
  async function _readTree({
    fs,
    cache,
    gitdir,
    oid,
    filepath = undefined
  }) {
    if (filepath !== undefined) {
      oid = await resolveFilepath({ fs, cache, gitdir, oid, filepath });
    }
    const { tree, oid: treeOid } = await resolveTree({ fs, cache, gitdir, oid });
    const result = {
      oid: treeOid,
      tree: tree.entries()
    };
    return result;
  }
  async function _writeTree({ fs, gitdir, tree }) {
    const object = GitTree.from(tree).toObject();
    const oid = await _writeObject({
      fs,
      gitdir,
      type: "tree",
      object,
      format: "content"
    });
    return oid;
  }
  async function _addNote({
    fs,
    cache,
    onSign,
    gitdir,
    ref,
    oid,
    note,
    force,
    author,
    committer,
    signingKey
  }) {
    let parent;
    try {
      parent = await GitRefManager.resolve({ gitdir, fs, ref });
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        throw err;
      }
    }
    const result = await _readTree({
      fs,
      cache,
      gitdir,
      oid: parent || "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    });
    let tree = result.tree;
    if (force) {
      tree = tree.filter((entry) => entry.path !== oid);
    } else {
      for (const entry of tree) {
        if (entry.path === oid) {
          throw new AlreadyExistsError("note", oid);
        }
      }
    }
    if (typeof note === "string") {
      note = Buffer.from(note, "utf8");
    }
    const noteOid = await _writeObject({
      fs,
      gitdir,
      type: "blob",
      object: note,
      format: "content"
    });
    tree.push({ mode: "100644", path: oid, oid: noteOid, type: "blob" });
    const treeOid = await _writeTree({
      fs,
      gitdir,
      tree
    });
    const commitOid = await _commit({
      fs,
      cache,
      onSign,
      gitdir,
      ref,
      tree: treeOid,
      parent: parent && [parent],
      message: `Note added by 'isomorphic-git addNote'
`,
      author,
      committer,
      signingKey
    });
    return commitOid;
  }
  async function addNote({
    fs: _fs,
    onSign,
    dir,
    gitdir = join(dir, ".git"),
    ref = "refs/notes/commits",
    oid,
    note,
    force,
    author: _author,
    committer: _committer,
    signingKey,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      assertParameter("note", note);
      if (signingKey) {
        assertParameter("onSign", onSign);
      }
      const fs = new FileSystem(_fs);
      const author = await normalizeAuthorObject({ fs, gitdir, author: _author });
      if (!author)
        throw new MissingNameError("author");
      const committer = await normalizeCommitterObject({
        fs,
        gitdir,
        author,
        committer: _committer
      });
      if (!committer)
        throw new MissingNameError("committer");
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      return await _addNote({
        fs,
        cache,
        onSign,
        gitdir: updatedGitdir,
        ref,
        oid,
        note,
        force,
        author,
        committer,
        signingKey
      });
    } catch (err) {
      err.caller = "git.addNote";
      throw err;
    }
  }
  var bad = /(^|[/.])([/.]|$)|^@$|@{|[\x00-\x20\x7f~^:?*[\\]|\.lock(\/|$)/;
  function isValidRef(name, onelevel) {
    if (typeof name !== "string")
      throw new TypeError("Reference name must be a string");
    return !bad.test(name) && (!!onelevel || name.includes("/"));
  }
  async function _addRemote({ fs, gitdir, remote, url, force }) {
    if (!isValidRef(remote, true)) {
      throw new InvalidRefNameError(remote, cleanGitRef.clean(remote));
    }
    const config = await GitConfigManager.get({ fs, gitdir });
    if (!force) {
      const remoteNames = await config.getSubsections("remote");
      if (remoteNames.includes(remote)) {
        if (url !== await config.get(`remote.${remote}.url`)) {
          throw new AlreadyExistsError("remote", remote);
        }
      }
    }
    await config.set(`remote.${remote}.url`, url);
    await config.set(`remote.${remote}.fetch`, `+refs/heads/*:refs/remotes/${remote}/*`);
    await GitConfigManager.save({ fs, gitdir, config });
  }
  async function addRemote({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    remote,
    url,
    force = false
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("remote", remote);
      assertParameter("url", url);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _addRemote({
        fs: fsp,
        gitdir: updatedGitdir,
        remote,
        url,
        force
      });
    } catch (err) {
      err.caller = "git.addRemote";
      throw err;
    }
  }
  async function _annotatedTag({
    fs,
    cache,
    onSign,
    gitdir,
    ref,
    tagger,
    message = ref,
    gpgsig,
    object,
    signingKey,
    force = false
  }) {
    ref = ref.startsWith("refs/tags/") ? ref : `refs/tags/${ref}`;
    if (!force && await GitRefManager.exists({ fs, gitdir, ref })) {
      throw new AlreadyExistsError("tag", ref);
    }
    const oid = await GitRefManager.resolve({
      fs,
      gitdir,
      ref: object || "HEAD"
    });
    const { type } = await _readObject({ fs, cache, gitdir, oid });
    let tagObject = GitAnnotatedTag.from({
      object: oid,
      type,
      tag: ref.replace("refs/tags/", ""),
      tagger,
      message,
      gpgsig
    });
    if (signingKey) {
      tagObject = await GitAnnotatedTag.sign(tagObject, onSign, signingKey);
    }
    const value = await _writeObject({
      fs,
      gitdir,
      type: "tag",
      object: tagObject.toObject()
    });
    await GitRefManager.writeRef({ fs, gitdir, ref, value });
  }
  async function annotatedTag({
    fs: _fs,
    onSign,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    tagger: _tagger,
    message = ref,
    gpgsig,
    object,
    signingKey,
    force = false,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      if (signingKey) {
        assertParameter("onSign", onSign);
      }
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const tagger = await normalizeAuthorObject({
        fs,
        gitdir: updatedGitdir,
        author: _tagger
      });
      if (!tagger)
        throw new MissingNameError("tagger");
      return await _annotatedTag({
        fs,
        cache,
        onSign,
        gitdir: updatedGitdir,
        ref,
        tagger,
        message,
        gpgsig,
        object,
        signingKey,
        force
      });
    } catch (err) {
      err.caller = "git.annotatedTag";
      throw err;
    }
  }
  async function _branch({
    fs,
    gitdir,
    ref,
    object,
    checkout: checkout2 = false,
    force = false
  }) {
    if (!isValidRef(ref, true)) {
      throw new InvalidRefNameError(ref, cleanGitRef.clean(ref));
    }
    const fullref = `refs/heads/${ref}`;
    if (!force) {
      const exist = await GitRefManager.exists({ fs, gitdir, ref: fullref });
      if (exist) {
        throw new AlreadyExistsError("branch", ref, false);
      }
    }
    let oid;
    try {
      oid = await GitRefManager.resolve({ fs, gitdir, ref: object || "HEAD" });
    } catch (e) {}
    if (oid) {
      await GitRefManager.writeRef({ fs, gitdir, ref: fullref, value: oid });
    }
    if (checkout2) {
      await GitRefManager.writeSymbolicRef({
        fs,
        gitdir,
        ref: "HEAD",
        value: fullref
      });
    }
  }
  async function branch({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    object,
    checkout: checkout2 = false,
    force = false
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _branch({
        fs: fsp,
        gitdir: updatedGitdir,
        ref,
        object,
        checkout: checkout2,
        force
      });
    } catch (err) {
      err.caller = "git.branch";
      throw err;
    }
  }
  var worthWalking = (filepath, root) => {
    if (filepath === "." || root == null || root.length === 0 || root === ".") {
      return true;
    }
    if (root.length >= filepath.length) {
      return root.startsWith(filepath);
    } else {
      return filepath.startsWith(root);
    }
  };
  async function _checkout({
    fs,
    cache,
    onProgress,
    onPostCheckout,
    dir,
    gitdir,
    remote,
    ref,
    filepaths,
    noCheckout,
    noUpdateHead,
    dryRun,
    force,
    track = true,
    nonBlocking = false,
    batchSize = 100
  }) {
    let oldOid;
    if (onPostCheckout) {
      try {
        oldOid = await GitRefManager.resolve({ fs, gitdir, ref: "HEAD" });
      } catch (err) {
        oldOid = "0000000000000000000000000000000000000000";
      }
    }
    let oid;
    try {
      oid = await GitRefManager.resolve({ fs, gitdir, ref });
    } catch (err) {
      if (ref === "HEAD")
        throw err;
      const remoteRef = `${remote}/${ref}`;
      oid = await GitRefManager.resolve({
        fs,
        gitdir,
        ref: remoteRef
      });
      if (track) {
        const config = await GitConfigManager.get({ fs, gitdir });
        await config.set(`branch.${ref}.remote`, remote);
        await config.set(`branch.${ref}.merge`, `refs/heads/${ref}`);
        await GitConfigManager.save({ fs, gitdir, config });
      }
      await GitRefManager.writeRef({
        fs,
        gitdir,
        ref: `refs/heads/${ref}`,
        value: oid
      });
    }
    if (!noCheckout) {
      let ops;
      try {
        ops = await analyze({
          fs,
          cache,
          onProgress,
          dir,
          gitdir,
          ref,
          force,
          filepaths
        });
      } catch (err) {
        if (err instanceof NotFoundError && err.data.what === oid) {
          throw new CommitNotFetchedError(ref, oid);
        } else {
          throw err;
        }
      }
      const conflicts = ops.filter(([method]) => method === "conflict").map(([method, fullpath]) => fullpath);
      if (conflicts.length > 0) {
        throw new CheckoutConflictError(conflicts);
      }
      const errors = ops.filter(([method]) => method === "error").map(([method, fullpath]) => fullpath);
      if (errors.length > 0) {
        throw new InternalError(errors.join(", "));
      }
      if (dryRun) {
        if (onPostCheckout) {
          await onPostCheckout({
            previousHead: oldOid,
            newHead: oid,
            type: filepaths != null && filepaths.length > 0 ? "file" : "branch"
          });
        }
        return;
      }
      let count = 0;
      const total = ops.length;
      await GitIndexManager.acquire({ fs, gitdir, cache }, async function(index2) {
        await Promise.all(ops.filter(([method]) => method === "delete" || method === "delete-index").map(async function([method, fullpath]) {
          const filepath = `${dir}/${fullpath}`;
          if (method === "delete") {
            await fs.rm(filepath);
          }
          index2.delete({ filepath: fullpath });
          if (onProgress) {
            await onProgress({
              phase: "Updating workdir",
              loaded: ++count,
              total
            });
          }
        }));
      });
      await GitIndexManager.acquire({ fs, gitdir, cache }, async function(index2) {
        for (const [method, fullpath] of ops) {
          if (method === "rmdir" || method === "rmdir-index") {
            const filepath = `${dir}/${fullpath}`;
            try {
              if (method === "rmdir") {
                await fs.rmdir(filepath);
              }
              index2.delete({ filepath: fullpath });
              if (onProgress) {
                await onProgress({
                  phase: "Updating workdir",
                  loaded: ++count,
                  total
                });
              }
            } catch (e) {
              if (e.code === "ENOTEMPTY") {
                console.log(`Did not delete ${fullpath} because directory is not empty`);
              } else {
                throw e;
              }
            }
          }
        }
      });
      await Promise.all(ops.filter(([method]) => method === "mkdir" || method === "mkdir-index").map(async function([_, fullpath]) {
        const filepath = `${dir}/${fullpath}`;
        await fs.mkdir(filepath);
        if (onProgress) {
          await onProgress({
            phase: "Updating workdir",
            loaded: ++count,
            total
          });
        }
      }));
      if (nonBlocking) {
        const eligibleOps = ops.filter(([method]) => method === "create" || method === "create-index" || method === "update" || method === "mkdir-index");
        const updateWorkingDirResults = await batchAllSettled("Update Working Dir", eligibleOps.map(([method, fullpath, oid2, mode, chmod]) => () => updateWorkingDir({ fs, cache, gitdir, dir }, [
          method,
          fullpath,
          oid2,
          mode,
          chmod
        ])), onProgress, batchSize);
        await GitIndexManager.acquire({ fs, gitdir, cache, allowUnmerged: true }, async function(index2) {
          await batchAllSettled("Update Index", updateWorkingDirResults.map(([fullpath, oid2, stats]) => () => updateIndex({ index: index2, fullpath, oid: oid2, stats })), onProgress, batchSize);
        });
      } else {
        await GitIndexManager.acquire({ fs, gitdir, cache, allowUnmerged: true }, async function(index2) {
          await Promise.all(ops.filter(([method]) => method === "create" || method === "create-index" || method === "update" || method === "mkdir-index").map(async function([method, fullpath, oid2, mode, chmod]) {
            const filepath = `${dir}/${fullpath}`;
            try {
              if (method !== "create-index" && method !== "mkdir-index") {
                const { object } = await _readObject({
                  fs,
                  cache,
                  gitdir,
                  oid: oid2
                });
                if (chmod) {
                  await fs.rm(filepath);
                }
                if (mode === 33188) {
                  await fs.write(filepath, object);
                } else if (mode === 33261) {
                  await fs.write(filepath, object, { mode: 511 });
                } else if (mode === 40960) {
                  await fs.writelink(filepath, object);
                } else {
                  throw new InternalError(`Invalid mode 0o${mode.toString(8)} detected in blob ${oid2}`);
                }
              }
              const stats = await fs.lstat(filepath);
              if (mode === 33261) {
                stats.mode = 493;
              }
              if (method === "mkdir-index") {
                stats.mode = 57344;
              }
              index2.insert({
                filepath: fullpath,
                stats,
                oid: oid2
              });
              if (onProgress) {
                await onProgress({
                  phase: "Updating workdir",
                  loaded: ++count,
                  total
                });
              }
            } catch (e) {
              console.log(e);
            }
          }));
        });
      }
      if (onPostCheckout) {
        await onPostCheckout({
          previousHead: oldOid,
          newHead: oid,
          type: filepaths != null && filepaths.length > 0 ? "file" : "branch"
        });
      }
    }
    if (!noUpdateHead) {
      const fullRef = await GitRefManager.expand({ fs, gitdir, ref });
      if (fullRef.startsWith("refs/heads")) {
        await GitRefManager.writeSymbolicRef({
          fs,
          gitdir,
          ref: "HEAD",
          value: fullRef
        });
      } else {
        await GitRefManager.writeRef({ fs, gitdir, ref: "HEAD", value: oid });
      }
    }
  }
  async function analyze({
    fs,
    cache,
    onProgress,
    dir,
    gitdir,
    ref,
    force,
    filepaths
  }) {
    let count = 0;
    return _walk({
      fs,
      cache,
      dir,
      gitdir,
      trees: [TREE({ ref }), WORKDIR(), STAGE()],
      map: async function(fullpath, [commit2, workdir, stage]) {
        if (fullpath === ".")
          return;
        if (filepaths && !filepaths.some((base) => worthWalking(fullpath, base))) {
          return null;
        }
        if (onProgress) {
          await onProgress({ phase: "Analyzing workdir", loaded: ++count });
        }
        const key = [!!stage, !!commit2, !!workdir].map(Number).join("");
        switch (key) {
          case "000":
            return;
          case "001":
            if (force && filepaths && filepaths.includes(fullpath)) {
              return ["delete", fullpath];
            }
            return;
          case "010": {
            switch (await commit2.type()) {
              case "tree": {
                return ["mkdir", fullpath];
              }
              case "blob": {
                return [
                  "create",
                  fullpath,
                  await commit2.oid(),
                  await commit2.mode()
                ];
              }
              case "commit": {
                return [
                  "mkdir-index",
                  fullpath,
                  await commit2.oid(),
                  await commit2.mode()
                ];
              }
              default: {
                return [
                  "error",
                  `new entry Unhandled type ${await commit2.type()}`
                ];
              }
            }
          }
          case "011": {
            switch (`${await commit2.type()}-${await workdir.type()}`) {
              case "tree-tree": {
                return;
              }
              case "tree-blob":
              case "blob-tree": {
                return ["conflict", fullpath];
              }
              case "blob-blob": {
                if (await commit2.oid() !== await workdir.oid()) {
                  if (force) {
                    return [
                      "update",
                      fullpath,
                      await commit2.oid(),
                      await commit2.mode(),
                      await commit2.mode() !== await workdir.mode()
                    ];
                  } else {
                    return ["conflict", fullpath];
                  }
                } else {
                  if (await commit2.mode() !== await workdir.mode()) {
                    if (force) {
                      return [
                        "update",
                        fullpath,
                        await commit2.oid(),
                        await commit2.mode(),
                        true
                      ];
                    } else {
                      return ["conflict", fullpath];
                    }
                  } else {
                    return [
                      "create-index",
                      fullpath,
                      await commit2.oid(),
                      await commit2.mode()
                    ];
                  }
                }
              }
              case "commit-tree": {
                return;
              }
              case "commit-blob": {
                return ["conflict", fullpath];
              }
              default: {
                return ["error", `new entry Unhandled type ${commit2.type}`];
              }
            }
          }
          case "100": {
            return ["delete-index", fullpath];
          }
          case "101": {
            switch (await stage.type()) {
              case "tree": {
                return ["rmdir-index", fullpath];
              }
              case "blob": {
                if (await stage.oid() !== await workdir.oid()) {
                  if (force) {
                    return ["delete", fullpath];
                  } else {
                    return ["conflict", fullpath];
                  }
                } else {
                  return ["delete", fullpath];
                }
              }
              case "commit": {
                return ["rmdir-index", fullpath];
              }
              default: {
                return [
                  "error",
                  `delete entry Unhandled type ${await stage.type()}`
                ];
              }
            }
          }
          case "110":
          case "111": {
            switch (`${await stage.type()}-${await commit2.type()}`) {
              case "tree-tree": {
                return;
              }
              case "blob-blob": {
                if (await stage.oid() === await commit2.oid() && await stage.mode() === await commit2.mode() && !force) {
                  return;
                }
                if (workdir) {
                  if (await workdir.oid() !== await stage.oid() && await workdir.oid() !== await commit2.oid()) {
                    if (force) {
                      return [
                        "update",
                        fullpath,
                        await commit2.oid(),
                        await commit2.mode(),
                        await commit2.mode() !== await workdir.mode()
                      ];
                    } else {
                      return ["conflict", fullpath];
                    }
                  }
                } else if (force) {
                  return [
                    "update",
                    fullpath,
                    await commit2.oid(),
                    await commit2.mode(),
                    await commit2.mode() !== await stage.mode()
                  ];
                }
                if (await commit2.mode() !== await stage.mode()) {
                  return [
                    "update",
                    fullpath,
                    await commit2.oid(),
                    await commit2.mode(),
                    true
                  ];
                }
                if (await commit2.oid() !== await stage.oid()) {
                  return [
                    "update",
                    fullpath,
                    await commit2.oid(),
                    await commit2.mode(),
                    false
                  ];
                } else {
                  return;
                }
              }
              case "tree-blob": {
                return ["update-dir-to-blob", fullpath, await commit2.oid()];
              }
              case "blob-tree": {
                return ["update-blob-to-tree", fullpath];
              }
              case "commit-commit": {
                return [
                  "mkdir-index",
                  fullpath,
                  await commit2.oid(),
                  await commit2.mode()
                ];
              }
              default: {
                return [
                  "error",
                  `update entry Unhandled type ${await stage.type()}-${await commit2.type()}`
                ];
              }
            }
          }
        }
      },
      reduce: async function(parent, children) {
        children = flat(children);
        if (!parent) {
          return children;
        } else if (parent && parent[0] === "rmdir") {
          children.push(parent);
          return children;
        } else {
          children.unshift(parent);
          return children;
        }
      }
    });
  }
  async function updateIndex({ index: index2, fullpath, stats, oid }) {
    try {
      index2.insert({
        filepath: fullpath,
        stats,
        oid
      });
    } catch (e) {
      console.warn(`Error inserting ${fullpath} into index:`, e);
    }
  }
  async function updateWorkingDir({ fs, cache, gitdir, dir }, [method, fullpath, oid, mode, chmod]) {
    const filepath = `${dir}/${fullpath}`;
    if (method !== "create-index" && method !== "mkdir-index") {
      const { object } = await _readObject({ fs, cache, gitdir, oid });
      if (chmod) {
        await fs.rm(filepath);
      }
      if (mode === 33188) {
        await fs.write(filepath, object);
      } else if (mode === 33261) {
        await fs.write(filepath, object, { mode: 511 });
      } else if (mode === 40960) {
        await fs.writelink(filepath, object);
      } else {
        throw new InternalError(`Invalid mode 0o${mode.toString(8)} detected in blob ${oid}`);
      }
    }
    const stats = await fs.lstat(filepath);
    if (mode === 33261) {
      stats.mode = 493;
    }
    if (method === "mkdir-index") {
      stats.mode = 57344;
    }
    return [fullpath, oid, stats];
  }
  async function batchAllSettled(operationName, tasks, onProgress, batchSize) {
    const results = [];
    try {
      for (let i = 0;i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize).map((task) => task());
        const batchResults = await Promise.allSettled(batch);
        batchResults.forEach((result) => {
          if (result.status === "fulfilled")
            results.push(result.value);
        });
        if (onProgress) {
          await onProgress({
            phase: "Updating workdir",
            loaded: i + batch.length,
            total: tasks.length
          });
        }
      }
      return results;
    } catch (error) {
      console.error(`Error during ${operationName}: ${error}`);
    }
    return results;
  }
  async function checkout({
    fs,
    onProgress,
    onPostCheckout,
    dir,
    gitdir = join(dir, ".git"),
    remote = "origin",
    ref: _ref,
    filepaths,
    noCheckout = false,
    noUpdateHead = _ref === undefined,
    dryRun = false,
    force = false,
    track = true,
    cache = {},
    nonBlocking = false,
    batchSize = 100
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("dir", dir);
      assertParameter("gitdir", gitdir);
      const ref = _ref || "HEAD";
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _checkout({
        fs: fsp,
        cache,
        onProgress,
        onPostCheckout,
        dir,
        gitdir: updatedGitdir,
        remote,
        ref,
        filepaths,
        noCheckout,
        noUpdateHead,
        dryRun,
        force,
        track,
        nonBlocking,
        batchSize
      });
    } catch (err) {
      err.caller = "git.checkout";
      throw err;
    }
  }
  var abbreviateRx = /^refs\/(heads\/|tags\/|remotes\/)?(.*)/;
  function abbreviateRef(ref) {
    const match = abbreviateRx.exec(ref);
    if (match) {
      if (match[1] === "remotes/" && ref.endsWith("/HEAD")) {
        return match[2].slice(0, -5);
      } else {
        return match[2];
      }
    }
    return ref;
  }
  async function _currentBranch({
    fs,
    gitdir,
    fullname = false,
    test = false
  }) {
    const ref = await GitRefManager.resolve({
      fs,
      gitdir,
      ref: "HEAD",
      depth: 2
    });
    if (test) {
      try {
        await GitRefManager.resolve({ fs, gitdir, ref });
      } catch (_) {
        return;
      }
    }
    if (!ref.startsWith("refs/"))
      return;
    return fullname ? ref : abbreviateRef(ref);
  }
  function translateSSHtoHTTP(url) {
    url = url.replace(/^git@([^:]+):/, "https://$1/");
    url = url.replace(/^ssh:\/\//, "https://");
    return url;
  }
  function calculateBasicAuthHeader({ username = "", password = "" }) {
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }
  async function forAwait(iterable, cb) {
    const iter = getIterator(iterable);
    while (true) {
      const { value, done } = await iter.next();
      if (value)
        await cb(value);
      if (done)
        break;
    }
    if (iter.return)
      iter.return();
  }
  async function collect(iterable) {
    let size = 0;
    const buffers = [];
    await forAwait(iterable, (value) => {
      buffers.push(value);
      size += value.byteLength;
    });
    const result = new Uint8Array(size);
    let nextIndex = 0;
    for (const buffer of buffers) {
      result.set(buffer, nextIndex);
      nextIndex += buffer.byteLength;
    }
    return result;
  }
  function extractAuthFromUrl(url) {
    let userpass = url.match(/^https?:\/\/([^/]+)@/);
    if (userpass == null)
      return { url, auth: {} };
    userpass = userpass[1];
    const [username, password] = userpass.split(":");
    url = url.replace(`${userpass}@`, "");
    return { url, auth: { username, password } };
  }
  function padHex(b, n) {
    const s = n.toString(16);
    return "0".repeat(b - s.length) + s;
  }

  class GitPktLine {
    static flush() {
      return Buffer.from("0000", "utf8");
    }
    static delim() {
      return Buffer.from("0001", "utf8");
    }
    static encode(line) {
      if (typeof line === "string") {
        line = Buffer.from(line);
      }
      const length = line.length + 4;
      const hexlength = padHex(4, length);
      return Buffer.concat([Buffer.from(hexlength, "utf8"), line]);
    }
    static streamReader(stream) {
      const reader = new StreamReader(stream);
      return async function read() {
        try {
          let length = await reader.read(4);
          if (length == null)
            return true;
          length = parseInt(length.toString("utf8"), 16);
          if (length === 0)
            return null;
          if (length === 1)
            return null;
          const buffer = await reader.read(length - 4);
          if (buffer == null)
            return true;
          return buffer;
        } catch (err) {
          stream.error = err;
          return true;
        }
      };
    }
  }
  async function parseCapabilitiesV2(read) {
    const capabilities2 = {};
    let line;
    while (true) {
      line = await read();
      if (line === true)
        break;
      if (line === null)
        continue;
      line = line.toString("utf8").replace(/\n$/, "");
      const i = line.indexOf("=");
      if (i > -1) {
        const key = line.slice(0, i);
        const value = line.slice(i + 1);
        capabilities2[key] = value;
      } else {
        capabilities2[line] = true;
      }
    }
    return { protocolVersion: 2, capabilities2 };
  }
  async function parseRefsAdResponse(stream, { service }) {
    const capabilities = new Set;
    const refs = new Map;
    const symrefs = new Map;
    const read = GitPktLine.streamReader(stream);
    let lineOne = await read();
    while (lineOne === null)
      lineOne = await read();
    if (lineOne === true)
      throw new EmptyServerResponseError;
    if (lineOne.includes("version 2")) {
      return parseCapabilitiesV2(read);
    }
    if (lineOne.toString("utf8").replace(/\n$/, "") !== `# service=${service}`) {
      throw new ParseError(`# service=${service}\\n`, lineOne.toString("utf8"));
    }
    let lineTwo = await read();
    while (lineTwo === null)
      lineTwo = await read();
    if (lineTwo === true)
      return { capabilities, refs, symrefs };
    lineTwo = lineTwo.toString("utf8");
    if (lineTwo.includes("version 2")) {
      return parseCapabilitiesV2(read);
    }
    const [firstRef, capabilitiesLine] = splitAndAssert(lineTwo, "\x00", "\\x00");
    capabilitiesLine.split(" ").map((x) => capabilities.add(x));
    if (firstRef !== "0000000000000000000000000000000000000000 capabilities^{}") {
      const [ref, name] = splitAndAssert(firstRef, " ", " ");
      refs.set(name, ref);
      while (true) {
        const line = await read();
        if (line === true)
          break;
        if (line !== null) {
          const [ref2, name2] = splitAndAssert(line.toString("utf8"), " ", " ");
          refs.set(name2, ref2);
        }
      }
    }
    for (const cap of capabilities) {
      if (cap.startsWith("symref=")) {
        const m = cap.match(/symref=([^:]+):(.*)/);
        if (m.length === 3) {
          symrefs.set(m[1], m[2]);
        }
      }
    }
    return { protocolVersion: 1, capabilities, refs, symrefs };
  }
  function splitAndAssert(line, sep, expected) {
    const split = line.trim().split(sep);
    if (split.length !== 2) {
      throw new ParseError(`Two strings separated by '${expected}'`, line.toString("utf8"));
    }
    return split;
  }
  var corsProxify = (corsProxy, url) => corsProxy.endsWith("?") ? `${corsProxy}${url}` : `${corsProxy}/${url.replace(/^https?:\/\//, "")}`;
  var updateHeaders = (headers, auth) => {
    if (auth.username || auth.password) {
      headers.Authorization = calculateBasicAuthHeader(auth);
    }
    if (auth.headers) {
      Object.assign(headers, auth.headers);
    }
  };
  var stringifyBody = async (res) => {
    try {
      const data = Buffer.from(await collect(res.body));
      const response = data.toString("utf8");
      const preview = response.length < 256 ? response : response.slice(0, 256) + "...";
      return { preview, response, data };
    } catch (e) {
      return {};
    }
  };

  class GitRemoteHTTP {
    static async capabilities() {
      return ["discover", "connect"];
    }
    static async discover({
      http,
      onProgress,
      onAuth,
      onAuthSuccess,
      onAuthFailure,
      corsProxy,
      service,
      url: _origUrl,
      headers,
      protocolVersion
    }) {
      let { url, auth } = extractAuthFromUrl(_origUrl);
      const proxifiedURL = corsProxy ? corsProxify(corsProxy, url) : url;
      if (auth.username || auth.password) {
        headers.Authorization = calculateBasicAuthHeader(auth);
      }
      if (protocolVersion === 2) {
        headers["Git-Protocol"] = "version=2";
      }
      let res;
      let tryAgain;
      let providedAuthBefore = false;
      do {
        res = await http.request({
          onProgress,
          method: "GET",
          url: `${proxifiedURL}/info/refs?service=${service}`,
          headers
        });
        tryAgain = false;
        if (res.statusCode === 401 || res.statusCode === 203) {
          const getAuth = providedAuthBefore ? onAuthFailure : onAuth;
          if (getAuth) {
            auth = await getAuth(url, {
              ...auth,
              headers: { ...headers }
            });
            if (auth && auth.cancel) {
              throw new UserCanceledError;
            } else if (auth) {
              updateHeaders(headers, auth);
              providedAuthBefore = true;
              tryAgain = true;
            }
          }
        } else if (res.statusCode === 200 && providedAuthBefore && onAuthSuccess) {
          await onAuthSuccess(url, auth);
        }
      } while (tryAgain);
      if (res.statusCode !== 200) {
        const { response } = await stringifyBody(res);
        throw new HttpError(res.statusCode, res.statusMessage, response);
      }
      if (res.headers["content-type"] === `application/x-${service}-advertisement`) {
        const remoteHTTP = await parseRefsAdResponse(res.body, { service });
        remoteHTTP.auth = auth;
        return remoteHTTP;
      } else {
        const { preview, response, data } = await stringifyBody(res);
        try {
          const remoteHTTP = await parseRefsAdResponse([data], { service });
          remoteHTTP.auth = auth;
          return remoteHTTP;
        } catch (e) {
          throw new SmartHttpError(preview, response);
        }
      }
    }
    static async connect({
      http,
      onProgress,
      corsProxy,
      service,
      url,
      auth,
      body,
      headers
    }) {
      const urlAuth = extractAuthFromUrl(url);
      if (urlAuth)
        url = urlAuth.url;
      if (corsProxy)
        url = corsProxify(corsProxy, url);
      headers["content-type"] = `application/x-${service}-request`;
      headers.accept = `application/x-${service}-result`;
      updateHeaders(headers, auth);
      const res = await http.request({
        onProgress,
        method: "POST",
        url: `${url}/${service}`,
        body,
        headers
      });
      if (res.statusCode !== 200) {
        const { response } = stringifyBody(res);
        throw new HttpError(res.statusCode, res.statusMessage, response);
      }
      return res;
    }
  }

  class GitRemoteManager {
    static getRemoteHelperFor({ url }) {
      const remoteHelpers = new Map;
      remoteHelpers.set("http", GitRemoteHTTP);
      remoteHelpers.set("https", GitRemoteHTTP);
      const parts = parseRemoteUrl({ url });
      if (!parts) {
        throw new UrlParseError(url);
      }
      if (remoteHelpers.has(parts.transport)) {
        return remoteHelpers.get(parts.transport);
      }
      throw new UnknownTransportError(url, parts.transport, parts.transport === "ssh" ? translateSSHtoHTTP(url) : undefined);
    }
  }
  function parseRemoteUrl({ url }) {
    if (url.startsWith("git@")) {
      return {
        transport: "ssh",
        address: url
      };
    }
    const matches = url.match(/(\w+)(:\/\/|::)(.*)/);
    if (matches === null)
      return;
    if (matches[2] === "://") {
      return {
        transport: matches[1],
        address: matches[0]
      };
    }
    if (matches[2] === "::") {
      return {
        transport: matches[1],
        address: matches[3]
      };
    }
  }
  var lock$2 = null;

  class GitShallowManager {
    static async read({ fs, gitdir }) {
      if (lock$2 === null)
        lock$2 = new AsyncLock;
      const filepath = join(gitdir, "shallow");
      const oids = new Set;
      await lock$2.acquire(filepath, async function() {
        const text = await fs.read(filepath, { encoding: "utf8" });
        if (text === null)
          return oids;
        if (text.trim() === "")
          return oids;
        text.trim().split(`
`).map((oid) => oids.add(oid));
      });
      return oids;
    }
    static async write({ fs, gitdir, oids }) {
      if (lock$2 === null)
        lock$2 = new AsyncLock;
      const filepath = join(gitdir, "shallow");
      if (oids.size > 0) {
        const text = [...oids].join(`
`) + `
`;
        await lock$2.acquire(filepath, async function() {
          await fs.write(filepath, text, {
            encoding: "utf8"
          });
        });
      } else {
        await lock$2.acquire(filepath, async function() {
          await fs.rm(filepath);
        });
      }
    }
  }
  async function hasObjectLoose({ fs, gitdir, oid }) {
    const source = `objects/${oid.slice(0, 2)}/${oid.slice(2)}`;
    return fs.exists(`${gitdir}/${source}`);
  }
  async function hasObjectPacked({
    fs,
    cache,
    gitdir,
    oid,
    getExternalRefDelta
  }) {
    let list = await fs.readdir(join(gitdir, "objects/pack"));
    list = list.filter((x) => x.endsWith(".idx"));
    for (const filename of list) {
      const indexFile = `${gitdir}/objects/pack/${filename}`;
      const p = await readPackIndex({
        fs,
        cache,
        filename: indexFile,
        getExternalRefDelta
      });
      if (p.error)
        throw new InternalError(p.error);
      if (p.offsets.has(oid)) {
        return true;
      }
    }
    return false;
  }
  async function hasObject({
    fs,
    cache,
    gitdir,
    oid,
    format = "content"
  }) {
    const getExternalRefDelta = (oid2) => _readObject({ fs, cache, gitdir, oid: oid2 });
    let result = await hasObjectLoose({ fs, gitdir, oid });
    if (!result) {
      result = await hasObjectPacked({
        fs,
        cache,
        gitdir,
        oid,
        getExternalRefDelta
      });
    }
    return result;
  }
  function emptyPackfile(pack) {
    const pheader = "5041434b";
    const version2 = "00000002";
    const obCount = "00000000";
    const header = pheader + version2 + obCount;
    return pack.slice(0, 12).toString("hex") === header;
  }
  function filterCapabilities(server, client) {
    const serverNames = server.map((cap) => cap.split("=", 1)[0]);
    return client.filter((cap) => {
      const name = cap.split("=", 1)[0];
      return serverNames.includes(name);
    });
  }
  var pkg = {
    name: "isomorphic-git",
    version: "1.36.0",
    agent: "git/isomorphic-git@1.36.0"
  };

  class FIFO {
    constructor() {
      this._queue = [];
    }
    write(chunk) {
      if (this._ended) {
        throw Error("You cannot write to a FIFO that has already been ended!");
      }
      if (this._waiting) {
        const resolve = this._waiting;
        this._waiting = null;
        resolve({ value: chunk });
      } else {
        this._queue.push(chunk);
      }
    }
    end() {
      this._ended = true;
      if (this._waiting) {
        const resolve = this._waiting;
        this._waiting = null;
        resolve({ done: true });
      }
    }
    destroy(err) {
      this.error = err;
      this.end();
    }
    async next() {
      if (this._queue.length > 0) {
        return { value: this._queue.shift() };
      }
      if (this._ended) {
        return { done: true };
      }
      if (this._waiting) {
        throw Error("You cannot call read until the previous call to read has returned!");
      }
      return new Promise((resolve) => {
        this._waiting = resolve;
      });
    }
  }
  function findSplit(str) {
    const r = str.indexOf("\r");
    const n = str.indexOf(`
`);
    if (r === -1 && n === -1)
      return -1;
    if (r === -1)
      return n + 1;
    if (n === -1)
      return r + 1;
    if (n === r + 1)
      return n + 1;
    return Math.min(r, n) + 1;
  }
  function splitLines(input) {
    const output = new FIFO;
    let tmp = "";
    (async () => {
      await forAwait(input, (chunk) => {
        chunk = chunk.toString("utf8");
        tmp += chunk;
        while (true) {
          const i = findSplit(tmp);
          if (i === -1)
            break;
          output.write(tmp.slice(0, i));
          tmp = tmp.slice(i);
        }
      });
      if (tmp.length > 0) {
        output.write(tmp);
      }
      output.end();
    })();
    return output;
  }

  class GitSideBand {
    static demux(input) {
      const read = GitPktLine.streamReader(input);
      const packetlines = new FIFO;
      const packfile = new FIFO;
      const progress = new FIFO;
      const nextBit = async function() {
        const line = await read();
        if (line === null)
          return nextBit();
        if (line === true) {
          packetlines.end();
          progress.end();
          input.error ? packfile.destroy(input.error) : packfile.end();
          return;
        }
        switch (line[0]) {
          case 1: {
            packfile.write(line.slice(1));
            break;
          }
          case 2: {
            progress.write(line.slice(1));
            break;
          }
          case 3: {
            const error = line.slice(1);
            progress.write(error);
            packetlines.end();
            progress.end();
            packfile.destroy(new Error(error.toString("utf8")));
            return;
          }
          default: {
            packetlines.write(line);
          }
        }
        nextBit();
      };
      nextBit();
      return {
        packetlines,
        packfile,
        progress
      };
    }
  }
  async function parseUploadPackResponse(stream) {
    const { packetlines, packfile, progress } = GitSideBand.demux(stream);
    const shallows = [];
    const unshallows = [];
    const acks = [];
    let nak = false;
    let done = false;
    return new Promise((resolve, reject) => {
      forAwait(packetlines, (data) => {
        const line = data.toString("utf8").trim();
        if (line.startsWith("shallow")) {
          const oid = line.slice(-41).trim();
          if (oid.length !== 40) {
            reject(new InvalidOidError(oid));
          }
          shallows.push(oid);
        } else if (line.startsWith("unshallow")) {
          const oid = line.slice(-41).trim();
          if (oid.length !== 40) {
            reject(new InvalidOidError(oid));
          }
          unshallows.push(oid);
        } else if (line.startsWith("ACK")) {
          const [, oid, status2] = line.split(" ");
          acks.push({ oid, status: status2 });
          if (!status2)
            done = true;
        } else if (line.startsWith("NAK")) {
          nak = true;
          done = true;
        } else {
          done = true;
          nak = true;
        }
        if (done) {
          stream.error ? reject(stream.error) : resolve({ shallows, unshallows, acks, nak, packfile, progress });
        }
      }).finally(() => {
        if (!done) {
          stream.error ? reject(stream.error) : resolve({ shallows, unshallows, acks, nak, packfile, progress });
        }
      });
    });
  }
  function writeUploadPackRequest({
    capabilities = [],
    wants = [],
    haves = [],
    shallows = [],
    depth = null,
    since = null,
    exclude = []
  }) {
    const packstream = [];
    wants = [...new Set(wants)];
    let firstLineCapabilities = ` ${capabilities.join(" ")}`;
    for (const oid of wants) {
      packstream.push(GitPktLine.encode(`want ${oid}${firstLineCapabilities}
`));
      firstLineCapabilities = "";
    }
    for (const oid of shallows) {
      packstream.push(GitPktLine.encode(`shallow ${oid}
`));
    }
    if (depth !== null) {
      packstream.push(GitPktLine.encode(`deepen ${depth}
`));
    }
    if (since !== null) {
      packstream.push(GitPktLine.encode(`deepen-since ${Math.floor(since.valueOf() / 1000)}
`));
    }
    for (const oid of exclude) {
      packstream.push(GitPktLine.encode(`deepen-not ${oid}
`));
    }
    packstream.push(GitPktLine.flush());
    for (const oid of haves) {
      packstream.push(GitPktLine.encode(`have ${oid}
`));
    }
    packstream.push(GitPktLine.encode(`done
`));
    return packstream;
  }
  async function _fetch({
    fs,
    cache,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    gitdir,
    ref: _ref,
    remoteRef: _remoteRef,
    remote: _remote,
    url: _url,
    corsProxy,
    depth = null,
    since = null,
    exclude = [],
    relative = false,
    tags = false,
    singleBranch = false,
    headers = {},
    prune = false,
    pruneTags = false
  }) {
    const ref = _ref || await _currentBranch({ fs, gitdir, test: true });
    const config = await GitConfigManager.get({ fs, gitdir });
    const remote = _remote || ref && await config.get(`branch.${ref}.remote`) || "origin";
    const url = _url || await config.get(`remote.${remote}.url`);
    if (typeof url === "undefined") {
      throw new MissingParameterError("remote OR url");
    }
    const remoteRef = _remoteRef || ref && await config.get(`branch.${ref}.merge`) || _ref || "HEAD";
    if (corsProxy === undefined) {
      corsProxy = await config.get("http.corsProxy");
    }
    const GitRemoteHTTP2 = GitRemoteManager.getRemoteHelperFor({ url });
    const remoteHTTP = await GitRemoteHTTP2.discover({
      http,
      onAuth,
      onAuthSuccess,
      onAuthFailure,
      corsProxy,
      service: "git-upload-pack",
      url,
      headers,
      protocolVersion: 1
    });
    const auth = remoteHTTP.auth;
    const remoteRefs = remoteHTTP.refs;
    if (remoteRefs.size === 0) {
      return {
        defaultBranch: null,
        fetchHead: null,
        fetchHeadDescription: null
      };
    }
    if (depth !== null && !remoteHTTP.capabilities.has("shallow")) {
      throw new RemoteCapabilityError("shallow", "depth");
    }
    if (since !== null && !remoteHTTP.capabilities.has("deepen-since")) {
      throw new RemoteCapabilityError("deepen-since", "since");
    }
    if (exclude.length > 0 && !remoteHTTP.capabilities.has("deepen-not")) {
      throw new RemoteCapabilityError("deepen-not", "exclude");
    }
    if (relative === true && !remoteHTTP.capabilities.has("deepen-relative")) {
      throw new RemoteCapabilityError("deepen-relative", "relative");
    }
    const { oid, fullref } = GitRefManager.resolveAgainstMap({
      ref: remoteRef,
      map: remoteRefs
    });
    for (const remoteRef2 of remoteRefs.keys()) {
      if (remoteRef2 === fullref || remoteRef2 === "HEAD" || remoteRef2.startsWith("refs/heads/") || tags && remoteRef2.startsWith("refs/tags/")) {
        continue;
      }
      remoteRefs.delete(remoteRef2);
    }
    const capabilities = filterCapabilities([...remoteHTTP.capabilities], [
      "multi_ack_detailed",
      "no-done",
      "side-band-64k",
      "ofs-delta",
      `agent=${pkg.agent}`
    ]);
    if (relative)
      capabilities.push("deepen-relative");
    const wants = singleBranch ? [oid] : remoteRefs.values();
    const haveRefs = singleBranch ? [ref] : await GitRefManager.listRefs({
      fs,
      gitdir,
      filepath: `refs`
    });
    let haves = [];
    for (let ref2 of haveRefs) {
      try {
        ref2 = await GitRefManager.expand({ fs, gitdir, ref: ref2 });
        const oid2 = await GitRefManager.resolve({ fs, gitdir, ref: ref2 });
        if (await hasObject({ fs, cache, gitdir, oid: oid2 })) {
          haves.push(oid2);
        }
      } catch (err) {}
    }
    haves = [...new Set(haves)];
    const oids = await GitShallowManager.read({ fs, gitdir });
    const shallows = remoteHTTP.capabilities.has("shallow") ? [...oids] : [];
    const packstream = writeUploadPackRequest({
      capabilities,
      wants,
      haves,
      shallows,
      depth,
      since,
      exclude
    });
    const packbuffer = Buffer.from(await collect(packstream));
    const raw = await GitRemoteHTTP2.connect({
      http,
      onProgress,
      corsProxy,
      service: "git-upload-pack",
      url,
      auth,
      body: [packbuffer],
      headers
    });
    const response = await parseUploadPackResponse(raw.body);
    if (raw.headers) {
      response.headers = raw.headers;
    }
    for (const oid2 of response.shallows) {
      if (!oids.has(oid2)) {
        try {
          const { object } = await _readObject({ fs, cache, gitdir, oid: oid2 });
          const commit2 = new GitCommit(object);
          const hasParents = await Promise.all(commit2.headers().parent.map((oid3) => hasObject({ fs, cache, gitdir, oid: oid3 })));
          const haveAllParents = hasParents.length === 0 || hasParents.every((has) => has);
          if (!haveAllParents) {
            oids.add(oid2);
          }
        } catch (err) {
          oids.add(oid2);
        }
      }
    }
    for (const oid2 of response.unshallows) {
      oids.delete(oid2);
    }
    await GitShallowManager.write({ fs, gitdir, oids });
    if (singleBranch) {
      const refs = new Map([[fullref, oid]]);
      const symrefs = new Map;
      let bail = 10;
      let key = fullref;
      while (bail--) {
        const value = remoteHTTP.symrefs.get(key);
        if (value === undefined)
          break;
        symrefs.set(key, value);
        key = value;
      }
      const realRef = remoteRefs.get(key);
      if (realRef) {
        refs.set(key, realRef);
      }
      const { pruned } = await GitRefManager.updateRemoteRefs({
        fs,
        gitdir,
        remote,
        refs,
        symrefs,
        tags,
        prune
      });
      if (prune) {
        response.pruned = pruned;
      }
    } else {
      const { pruned } = await GitRefManager.updateRemoteRefs({
        fs,
        gitdir,
        remote,
        refs: remoteRefs,
        symrefs: remoteHTTP.symrefs,
        tags,
        prune,
        pruneTags
      });
      if (prune) {
        response.pruned = pruned;
      }
    }
    response.HEAD = remoteHTTP.symrefs.get("HEAD");
    if (response.HEAD === undefined) {
      const { oid: oid2 } = GitRefManager.resolveAgainstMap({
        ref: "HEAD",
        map: remoteRefs
      });
      for (const [key, value] of remoteRefs.entries()) {
        if (key !== "HEAD" && value === oid2) {
          response.HEAD = key;
          break;
        }
      }
    }
    const noun = fullref.startsWith("refs/tags") ? "tag" : "branch";
    response.FETCH_HEAD = {
      oid,
      description: `${noun} '${abbreviateRef(fullref)}' of ${url}`
    };
    if (onProgress || onMessage) {
      const lines = splitLines(response.progress);
      forAwait(lines, async (line) => {
        if (onMessage)
          await onMessage(line);
        if (onProgress) {
          const matches = line.match(/([^:]*).*\((\d+?)\/(\d+?)\)/);
          if (matches) {
            await onProgress({
              phase: matches[1].trim(),
              loaded: parseInt(matches[2], 10),
              total: parseInt(matches[3], 10)
            });
          }
        }
      });
    }
    const packfile = Buffer.from(await collect(response.packfile));
    if (raw.body.error)
      throw raw.body.error;
    const packfileSha = packfile.slice(-20).toString("hex");
    const res = {
      defaultBranch: response.HEAD,
      fetchHead: response.FETCH_HEAD.oid,
      fetchHeadDescription: response.FETCH_HEAD.description
    };
    if (response.headers) {
      res.headers = response.headers;
    }
    if (prune) {
      res.pruned = response.pruned;
    }
    if (packfileSha !== "" && !emptyPackfile(packfile)) {
      res.packfile = `objects/pack/pack-${packfileSha}.pack`;
      const fullpath = join(gitdir, res.packfile);
      await fs.write(fullpath, packfile);
      const getExternalRefDelta = (oid2) => _readObject({ fs, cache, gitdir, oid: oid2 });
      const idx = await GitPackIndex.fromPack({
        pack: packfile,
        getExternalRefDelta,
        onProgress
      });
      await fs.write(fullpath.replace(/\.pack$/, ".idx"), await idx.toBuffer());
    }
    return res;
  }
  async function _init({
    fs,
    bare = false,
    dir,
    gitdir = bare ? dir : join(dir, ".git"),
    defaultBranch = "master"
  }) {
    if (await fs.exists(gitdir + "/config"))
      return;
    let folders = [
      "hooks",
      "info",
      "objects/info",
      "objects/pack",
      "refs/heads",
      "refs/tags"
    ];
    folders = folders.map((dir2) => gitdir + "/" + dir2);
    for (const folder of folders) {
      await fs.mkdir(folder);
    }
    await fs.write(gitdir + "/config", `[core]
` + `	repositoryformatversion = 0
` + `	filemode = false
` + `	bare = ${bare}
` + (bare ? "" : `	logallrefupdates = true
`) + `	symlinks = false
` + `	ignorecase = true
`);
    await fs.write(gitdir + "/HEAD", `ref: refs/heads/${defaultBranch}
`);
  }
  async function _clone({
    fs,
    cache,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    onPostCheckout,
    dir,
    gitdir,
    url,
    corsProxy,
    ref,
    remote,
    depth,
    since,
    exclude,
    relative,
    singleBranch,
    noCheckout,
    noTags,
    headers,
    nonBlocking,
    batchSize = 100
  }) {
    try {
      await _init({ fs, gitdir });
      await _addRemote({ fs, gitdir, remote, url, force: false });
      if (corsProxy) {
        const config = await GitConfigManager.get({ fs, gitdir });
        await config.set(`http.corsProxy`, corsProxy);
        await GitConfigManager.save({ fs, gitdir, config });
      }
      const { defaultBranch, fetchHead } = await _fetch({
        fs,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        gitdir,
        ref,
        remote,
        corsProxy,
        depth,
        since,
        exclude,
        relative,
        singleBranch,
        headers,
        tags: !noTags
      });
      if (fetchHead === null)
        return;
      ref = ref || defaultBranch;
      ref = ref.replace("refs/heads/", "");
      await _checkout({
        fs,
        cache,
        onProgress,
        onPostCheckout,
        dir,
        gitdir,
        ref,
        remote,
        noCheckout,
        nonBlocking,
        batchSize
      });
    } catch (err) {
      await fs.rmdir(gitdir, { recursive: true, maxRetries: 10 }).catch(() => {
        return;
      });
      throw err;
    }
  }
  async function clone({
    fs,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    onPostCheckout,
    dir,
    gitdir = join(dir, ".git"),
    url,
    corsProxy = undefined,
    ref = undefined,
    remote = "origin",
    depth = undefined,
    since = undefined,
    exclude = [],
    relative = false,
    singleBranch = false,
    noCheckout = false,
    noTags = false,
    headers = {},
    cache = {},
    nonBlocking = false,
    batchSize = 100
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("http", http);
      assertParameter("gitdir", gitdir);
      if (!noCheckout) {
        assertParameter("dir", dir);
      }
      assertParameter("url", url);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _clone({
        fs: fsp,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        onPostCheckout,
        dir,
        gitdir: updatedGitdir,
        url,
        corsProxy,
        ref,
        remote,
        depth,
        since,
        exclude,
        relative,
        singleBranch,
        noCheckout,
        noTags,
        headers,
        nonBlocking,
        batchSize
      });
    } catch (err) {
      err.caller = "git.clone";
      throw err;
    }
  }
  async function commit({
    fs: _fs,
    onSign,
    dir,
    gitdir = join(dir, ".git"),
    message,
    author,
    committer,
    signingKey,
    amend = false,
    dryRun = false,
    noUpdateBranch = false,
    ref,
    parent,
    tree,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      if (!amend) {
        assertParameter("message", message);
      }
      if (signingKey) {
        assertParameter("onSign", onSign);
      }
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      return await _commit({
        fs,
        cache,
        onSign,
        gitdir: updatedGitdir,
        message,
        author,
        committer,
        signingKey,
        amend,
        dryRun,
        noUpdateBranch,
        ref,
        parent,
        tree
      });
    } catch (err) {
      err.caller = "git.commit";
      throw err;
    }
  }
  async function currentBranch({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    fullname = false,
    test = false
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _currentBranch({
        fs: fsp,
        gitdir: updatedGitdir,
        fullname,
        test
      });
    } catch (err) {
      err.caller = "git.currentBranch";
      throw err;
    }
  }
  async function _deleteBranch({ fs, gitdir, ref }) {
    ref = ref.startsWith("refs/heads/") ? ref : `refs/heads/${ref}`;
    const exist = await GitRefManager.exists({ fs, gitdir, ref });
    if (!exist) {
      throw new NotFoundError(ref);
    }
    const fullRef = await GitRefManager.expand({ fs, gitdir, ref });
    const currentRef = await _currentBranch({ fs, gitdir, fullname: true });
    if (fullRef === currentRef) {
      const value = await GitRefManager.resolve({ fs, gitdir, ref: fullRef });
      await GitRefManager.writeRef({ fs, gitdir, ref: "HEAD", value });
    }
    await GitRefManager.deleteRef({ fs, gitdir, ref: fullRef });
    const abbrevRef = abbreviateRef(ref);
    const config = await GitConfigManager.get({ fs, gitdir });
    await config.deleteSection("branch", abbrevRef);
    await GitConfigManager.save({ fs, gitdir, config });
  }
  async function deleteBranch({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _deleteBranch({
        fs: fsp,
        gitdir: updatedGitdir,
        ref
      });
    } catch (err) {
      err.caller = "git.deleteBranch";
      throw err;
    }
  }
  async function deleteRef({ fs, dir, gitdir = join(dir, ".git"), ref }) {
    try {
      assertParameter("fs", fs);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      await GitRefManager.deleteRef({ fs: fsp, gitdir: updatedGitdir, ref });
    } catch (err) {
      err.caller = "git.deleteRef";
      throw err;
    }
  }
  async function _deleteRemote({ fs, gitdir, remote }) {
    const config = await GitConfigManager.get({ fs, gitdir });
    await config.deleteSection("remote", remote);
    await GitConfigManager.save({ fs, gitdir, config });
  }
  async function deleteRemote({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    remote
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("remote", remote);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _deleteRemote({
        fs: fsp,
        gitdir: updatedGitdir,
        remote
      });
    } catch (err) {
      err.caller = "git.deleteRemote";
      throw err;
    }
  }
  async function _deleteTag({ fs, gitdir, ref }) {
    ref = ref.startsWith("refs/tags/") ? ref : `refs/tags/${ref}`;
    await GitRefManager.deleteRef({ fs, gitdir, ref });
  }
  async function deleteTag({ fs, dir, gitdir = join(dir, ".git"), ref }) {
    try {
      assertParameter("fs", fs);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _deleteTag({
        fs: fsp,
        gitdir: updatedGitdir,
        ref
      });
    } catch (err) {
      err.caller = "git.deleteTag";
      throw err;
    }
  }
  async function expandOidLoose({ fs, gitdir, oid: short }) {
    const prefix = short.slice(0, 2);
    const objectsSuffixes = await fs.readdir(`${gitdir}/objects/${prefix}`);
    return objectsSuffixes.map((suffix) => `${prefix}${suffix}`).filter((_oid) => _oid.startsWith(short));
  }
  async function expandOidPacked({
    fs,
    cache,
    gitdir,
    oid: short,
    getExternalRefDelta
  }) {
    const results = [];
    let list = await fs.readdir(join(gitdir, "objects/pack"));
    list = list.filter((x) => x.endsWith(".idx"));
    for (const filename of list) {
      const indexFile = `${gitdir}/objects/pack/${filename}`;
      const p = await readPackIndex({
        fs,
        cache,
        filename: indexFile,
        getExternalRefDelta
      });
      if (p.error)
        throw new InternalError(p.error);
      for (const oid of p.offsets.keys()) {
        if (oid.startsWith(short))
          results.push(oid);
      }
    }
    return results;
  }
  async function _expandOid({ fs, cache, gitdir, oid: short }) {
    const getExternalRefDelta = (oid) => _readObject({ fs, cache, gitdir, oid });
    const results = await expandOidLoose({ fs, gitdir, oid: short });
    const packedOids = await expandOidPacked({
      fs,
      cache,
      gitdir,
      oid: short,
      getExternalRefDelta
    });
    for (const packedOid of packedOids) {
      if (results.indexOf(packedOid) === -1) {
        results.push(packedOid);
      }
    }
    if (results.length === 1) {
      return results[0];
    }
    if (results.length > 1) {
      throw new AmbiguousError("oids", short, results);
    }
    throw new NotFoundError(`an object matching "${short}"`);
  }
  async function expandOid({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _expandOid({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oid
      });
    } catch (err) {
      err.caller = "git.expandOid";
      throw err;
    }
  }
  async function expandRef({ fs, dir, gitdir = join(dir, ".git"), ref }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await GitRefManager.expand({
        fs: fsp,
        gitdir: updatedGitdir,
        ref
      });
    } catch (err) {
      err.caller = "git.expandRef";
      throw err;
    }
  }
  async function _findMergeBase({ fs, cache, gitdir, oids }) {
    const visits = {};
    const passes = oids.length;
    let heads = oids.map((oid, index2) => ({ index: index2, oid }));
    while (heads.length) {
      const result = new Set;
      for (const { oid, index: index2 } of heads) {
        if (!visits[oid])
          visits[oid] = new Set;
        visits[oid].add(index2);
        if (visits[oid].size === passes) {
          result.add(oid);
        }
      }
      if (result.size > 0) {
        return [...result];
      }
      const newheads = new Map;
      for (const { oid, index: index2 } of heads) {
        try {
          const { object } = await _readObject({ fs, cache, gitdir, oid });
          const commit2 = GitCommit.from(object);
          const { parent } = commit2.parseHeaders();
          for (const oid2 of parent) {
            if (!visits[oid2] || !visits[oid2].has(index2)) {
              newheads.set(oid2 + ":" + index2, { oid: oid2, index: index2 });
            }
          }
        } catch (err) {}
      }
      heads = Array.from(newheads.values());
    }
    return [];
  }
  var LINEBREAKS = /^.*(\r?\n|$)/gm;
  function mergeFile({ branches, contents }) {
    const ourName = branches[1];
    const theirName = branches[2];
    const baseContent = contents[0];
    const ourContent = contents[1];
    const theirContent = contents[2];
    const ours = ourContent.match(LINEBREAKS);
    const base = baseContent.match(LINEBREAKS);
    const theirs = theirContent.match(LINEBREAKS);
    const result = diff3Merge(ours, base, theirs);
    const markerSize = 7;
    let mergedText = "";
    let cleanMerge = true;
    for (const item of result) {
      if (item.ok) {
        mergedText += item.ok.join("");
      }
      if (item.conflict) {
        cleanMerge = false;
        mergedText += `${"<".repeat(markerSize)} ${ourName}
`;
        mergedText += item.conflict.a.join("");
        mergedText += `${"=".repeat(markerSize)}
`;
        mergedText += item.conflict.b.join("");
        mergedText += `${">".repeat(markerSize)} ${theirName}
`;
      }
    }
    return { cleanMerge, mergedText };
  }
  async function mergeTree({
    fs,
    cache,
    dir,
    gitdir = join(dir, ".git"),
    index: index2,
    ourOid,
    baseOid,
    theirOid,
    ourName = "ours",
    baseName = "base",
    theirName = "theirs",
    dryRun = false,
    abortOnConflict = true,
    mergeDriver
  }) {
    const ourTree = TREE({ ref: ourOid });
    const baseTree = TREE({ ref: baseOid });
    const theirTree = TREE({ ref: theirOid });
    const unmergedFiles = [];
    const bothModified = [];
    const deleteByUs = [];
    const deleteByTheirs = [];
    const results = await _walk({
      fs,
      cache,
      dir,
      gitdir,
      trees: [ourTree, baseTree, theirTree],
      map: async function(filepath, [ours, base, theirs]) {
        const path = basename(filepath);
        const ourChange = await modified(ours, base);
        const theirChange = await modified(theirs, base);
        switch (`${ourChange}-${theirChange}`) {
          case "false-false": {
            return {
              mode: await base.mode(),
              path,
              oid: await base.oid(),
              type: await base.type()
            };
          }
          case "false-true": {
            if (!theirs && await ours.type() === "tree") {
              return {
                mode: await ours.mode(),
                path,
                oid: await ours.oid(),
                type: await ours.type()
              };
            }
            return theirs ? {
              mode: await theirs.mode(),
              path,
              oid: await theirs.oid(),
              type: await theirs.type()
            } : undefined;
          }
          case "true-false": {
            if (!ours && await theirs.type() === "tree") {
              return {
                mode: await theirs.mode(),
                path,
                oid: await theirs.oid(),
                type: await theirs.type()
              };
            }
            return ours ? {
              mode: await ours.mode(),
              path,
              oid: await ours.oid(),
              type: await ours.type()
            } : undefined;
          }
          case "true-true": {
            if (ours && theirs && await ours.type() === "tree" && await theirs.type() === "tree") {
              return {
                mode: await ours.mode(),
                path,
                oid: await ours.oid(),
                type: "tree"
              };
            }
            if (ours && theirs && await ours.type() === "blob" && await theirs.type() === "blob") {
              return mergeBlobs({
                fs,
                gitdir,
                path,
                ours,
                base,
                theirs,
                ourName,
                baseName,
                theirName,
                mergeDriver
              }).then(async (r) => {
                if (!r.cleanMerge) {
                  unmergedFiles.push(filepath);
                  bothModified.push(filepath);
                  if (!abortOnConflict) {
                    let baseOid2 = "";
                    if (base && await base.type() === "blob") {
                      baseOid2 = await base.oid();
                    }
                    const ourOid2 = await ours.oid();
                    const theirOid2 = await theirs.oid();
                    index2.delete({ filepath });
                    if (baseOid2) {
                      index2.insert({ filepath, oid: baseOid2, stage: 1 });
                    }
                    index2.insert({ filepath, oid: ourOid2, stage: 2 });
                    index2.insert({ filepath, oid: theirOid2, stage: 3 });
                  }
                } else if (!abortOnConflict) {
                  index2.insert({ filepath, oid: r.mergeResult.oid, stage: 0 });
                }
                return r.mergeResult;
              });
            }
            if (base && !ours && theirs && await base.type() === "blob" && await theirs.type() === "blob") {
              unmergedFiles.push(filepath);
              deleteByUs.push(filepath);
              if (!abortOnConflict) {
                const baseOid2 = await base.oid();
                const theirOid2 = await theirs.oid();
                index2.delete({ filepath });
                index2.insert({ filepath, oid: baseOid2, stage: 1 });
                index2.insert({ filepath, oid: theirOid2, stage: 3 });
              }
              return {
                mode: await theirs.mode(),
                oid: await theirs.oid(),
                type: "blob",
                path
              };
            }
            if (base && ours && !theirs && await base.type() === "blob" && await ours.type() === "blob") {
              unmergedFiles.push(filepath);
              deleteByTheirs.push(filepath);
              if (!abortOnConflict) {
                const baseOid2 = await base.oid();
                const ourOid2 = await ours.oid();
                index2.delete({ filepath });
                index2.insert({ filepath, oid: baseOid2, stage: 1 });
                index2.insert({ filepath, oid: ourOid2, stage: 2 });
              }
              return {
                mode: await ours.mode(),
                oid: await ours.oid(),
                type: "blob",
                path
              };
            }
            if (base && !ours && !theirs && (await base.type() === "blob" || await base.type() === "tree")) {
              return;
            }
            throw new MergeNotSupportedError;
          }
        }
      },
      reduce: unmergedFiles.length !== 0 && (!dir || abortOnConflict) ? undefined : async (parent, children) => {
        const entries = children.filter(Boolean);
        if (!parent)
          return;
        if (parent && parent.type === "tree" && entries.length === 0 && parent.path !== ".")
          return;
        if (entries.length > 0 || parent.path === "." && entries.length === 0) {
          const tree = new GitTree(entries);
          const object = tree.toObject();
          const oid = await _writeObject({
            fs,
            gitdir,
            type: "tree",
            object,
            dryRun
          });
          parent.oid = oid;
        }
        return parent;
      }
    });
    if (unmergedFiles.length !== 0) {
      if (dir && !abortOnConflict) {
        await _walk({
          fs,
          cache,
          dir,
          gitdir,
          trees: [TREE({ ref: results.oid })],
          map: async function(filepath, [entry]) {
            const path = `${dir}/${filepath}`;
            if (await entry.type() === "blob") {
              const mode = await entry.mode();
              const content = new TextDecoder().decode(await entry.content());
              await fs.write(path, content, { mode });
            }
            return true;
          }
        });
      }
      return new MergeConflictError(unmergedFiles, bothModified, deleteByUs, deleteByTheirs);
    }
    return results.oid;
  }
  async function mergeBlobs({
    fs,
    gitdir,
    path,
    ours,
    base,
    theirs,
    ourName,
    theirName,
    baseName,
    dryRun,
    mergeDriver = mergeFile
  }) {
    const type = "blob";
    let baseMode = "100755";
    let baseOid = "";
    let baseContent = "";
    if (base && await base.type() === "blob") {
      baseMode = await base.mode();
      baseOid = await base.oid();
      baseContent = Buffer.from(await base.content()).toString("utf8");
    }
    const mode = baseMode === await ours.mode() ? await theirs.mode() : await ours.mode();
    if (await ours.oid() === await theirs.oid()) {
      return {
        cleanMerge: true,
        mergeResult: { mode, path, oid: await ours.oid(), type }
      };
    }
    if (await ours.oid() === baseOid) {
      return {
        cleanMerge: true,
        mergeResult: { mode, path, oid: await theirs.oid(), type }
      };
    }
    if (await theirs.oid() === baseOid) {
      return {
        cleanMerge: true,
        mergeResult: { mode, path, oid: await ours.oid(), type }
      };
    }
    const ourContent = Buffer.from(await ours.content()).toString("utf8");
    const theirContent = Buffer.from(await theirs.content()).toString("utf8");
    const { mergedText, cleanMerge } = await mergeDriver({
      branches: [baseName, ourName, theirName],
      contents: [baseContent, ourContent, theirContent],
      path
    });
    const oid = await _writeObject({
      fs,
      gitdir,
      type: "blob",
      object: Buffer.from(mergedText, "utf8"),
      dryRun
    });
    return { cleanMerge, mergeResult: { mode, path, oid, type } };
  }
  async function _merge({
    fs,
    cache,
    dir,
    gitdir,
    ours,
    theirs,
    fastForward: fastForward2 = true,
    fastForwardOnly = false,
    dryRun = false,
    noUpdateBranch = false,
    abortOnConflict = true,
    message,
    author,
    committer,
    signingKey,
    onSign,
    mergeDriver,
    allowUnrelatedHistories = false
  }) {
    if (ours === undefined) {
      ours = await _currentBranch({ fs, gitdir, fullname: true });
    }
    ours = await GitRefManager.expand({
      fs,
      gitdir,
      ref: ours
    });
    theirs = await GitRefManager.expand({
      fs,
      gitdir,
      ref: theirs
    });
    const ourOid = await GitRefManager.resolve({
      fs,
      gitdir,
      ref: ours
    });
    const theirOid = await GitRefManager.resolve({
      fs,
      gitdir,
      ref: theirs
    });
    const baseOids = await _findMergeBase({
      fs,
      cache,
      gitdir,
      oids: [ourOid, theirOid]
    });
    if (baseOids.length !== 1) {
      if (baseOids.length === 0 && allowUnrelatedHistories) {
        baseOids.push("4b825dc642cb6eb9a060e54bf8d69288fbee4904");
      } else {
        throw new MergeNotSupportedError;
      }
    }
    const baseOid = baseOids[0];
    if (baseOid === theirOid) {
      return {
        oid: ourOid,
        alreadyMerged: true
      };
    }
    if (fastForward2 && baseOid === ourOid) {
      if (!dryRun && !noUpdateBranch) {
        await GitRefManager.writeRef({ fs, gitdir, ref: ours, value: theirOid });
      }
      return {
        oid: theirOid,
        fastForward: true
      };
    } else {
      if (fastForwardOnly) {
        throw new FastForwardError;
      }
      const tree = await GitIndexManager.acquire({ fs, gitdir, cache, allowUnmerged: false }, async (index2) => {
        return mergeTree({
          fs,
          cache,
          dir,
          gitdir,
          index: index2,
          ourOid,
          theirOid,
          baseOid,
          ourName: abbreviateRef(ours),
          baseName: "base",
          theirName: abbreviateRef(theirs),
          dryRun,
          abortOnConflict,
          mergeDriver
        });
      });
      if (tree instanceof MergeConflictError)
        throw tree;
      if (!message) {
        message = `Merge branch '${abbreviateRef(theirs)}' into ${abbreviateRef(ours)}`;
      }
      const oid = await _commit({
        fs,
        cache,
        gitdir,
        message,
        ref: ours,
        tree,
        parent: [ourOid, theirOid],
        author,
        committer,
        signingKey,
        onSign,
        dryRun,
        noUpdateBranch
      });
      return {
        oid,
        tree,
        mergeCommit: true
      };
    }
  }
  async function _pull({
    fs,
    cache,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    dir,
    gitdir,
    ref,
    url,
    remote,
    remoteRef,
    prune,
    pruneTags,
    fastForward: fastForward2,
    fastForwardOnly,
    corsProxy,
    singleBranch,
    headers,
    author,
    committer,
    signingKey
  }) {
    try {
      if (!ref) {
        const head = await _currentBranch({ fs, gitdir });
        if (!head) {
          throw new MissingParameterError("ref");
        }
        ref = head;
      }
      const { fetchHead, fetchHeadDescription } = await _fetch({
        fs,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        gitdir,
        corsProxy,
        ref,
        url,
        remote,
        remoteRef,
        singleBranch,
        headers,
        prune,
        pruneTags
      });
      await _merge({
        fs,
        cache,
        gitdir,
        ours: ref,
        theirs: fetchHead,
        fastForward: fastForward2,
        fastForwardOnly,
        message: `Merge ${fetchHeadDescription}`,
        author,
        committer,
        signingKey,
        dryRun: false,
        noUpdateBranch: false
      });
      await _checkout({
        fs,
        cache,
        onProgress,
        dir,
        gitdir,
        ref,
        remote,
        noCheckout: false
      });
    } catch (err) {
      err.caller = "git.pull";
      throw err;
    }
  }
  async function fastForward({
    fs,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    url,
    remote,
    remoteRef,
    corsProxy,
    singleBranch,
    headers = {},
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("http", http);
      assertParameter("gitdir", gitdir);
      const thisWillNotBeUsed = {
        name: "",
        email: "",
        timestamp: Date.now(),
        timezoneOffset: 0
      };
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _pull({
        fs: fsp,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        dir,
        gitdir: updatedGitdir,
        ref,
        url,
        remote,
        remoteRef,
        fastForwardOnly: true,
        corsProxy,
        singleBranch,
        headers,
        author: thisWillNotBeUsed,
        committer: thisWillNotBeUsed
      });
    } catch (err) {
      err.caller = "git.fastForward";
      throw err;
    }
  }
  async function fetch({
    fs,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    remote,
    remoteRef,
    url,
    corsProxy,
    depth = null,
    since = null,
    exclude = [],
    relative = false,
    tags = false,
    singleBranch = false,
    headers = {},
    prune = false,
    pruneTags = false,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("http", http);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _fetch({
        fs: fsp,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        gitdir: updatedGitdir,
        ref,
        remote,
        remoteRef,
        url,
        corsProxy,
        depth,
        since,
        exclude,
        relative,
        tags,
        singleBranch,
        headers,
        prune,
        pruneTags
      });
    } catch (err) {
      err.caller = "git.fetch";
      throw err;
    }
  }
  async function findMergeBase({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oids,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oids", oids);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _findMergeBase({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oids
      });
    } catch (err) {
      err.caller = "git.findMergeBase";
      throw err;
    }
  }
  async function _findRoot({ fs, filepath }) {
    if (await fs.exists(join(filepath, ".git"))) {
      return filepath;
    } else {
      const parent = dirname(filepath);
      if (parent === filepath) {
        throw new NotFoundError(`git root for ${filepath}`);
      }
      return _findRoot({ fs, filepath: parent });
    }
  }
  async function findRoot({ fs, filepath }) {
    try {
      assertParameter("fs", fs);
      assertParameter("filepath", filepath);
      return await _findRoot({ fs: new FileSystem(fs), filepath });
    } catch (err) {
      err.caller = "git.findRoot";
      throw err;
    }
  }
  async function getConfig({ fs, dir, gitdir = join(dir, ".git"), path }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("path", path);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _getConfig({
        fs: fsp,
        gitdir: updatedGitdir,
        path
      });
    } catch (err) {
      err.caller = "git.getConfig";
      throw err;
    }
  }
  async function _getConfigAll({ fs, gitdir, path }) {
    const config = await GitConfigManager.get({ fs, gitdir });
    return config.getall(path);
  }
  async function getConfigAll({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    path
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("path", path);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _getConfigAll({
        fs: fsp,
        gitdir: updatedGitdir,
        path
      });
    } catch (err) {
      err.caller = "git.getConfigAll";
      throw err;
    }
  }
  async function getRemoteInfo({
    http,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    corsProxy,
    url,
    headers = {},
    forPush = false
  }) {
    try {
      assertParameter("http", http);
      assertParameter("url", url);
      const GitRemoteHTTP2 = GitRemoteManager.getRemoteHelperFor({ url });
      const remote = await GitRemoteHTTP2.discover({
        http,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        corsProxy,
        service: forPush ? "git-receive-pack" : "git-upload-pack",
        url,
        headers,
        protocolVersion: 1
      });
      const result = {
        capabilities: [...remote.capabilities]
      };
      for (const [ref, oid] of remote.refs) {
        const parts = ref.split("/");
        const last = parts.pop();
        let o = result;
        for (const part of parts) {
          o[part] = o[part] || {};
          o = o[part];
        }
        o[last] = oid;
      }
      for (const [symref, ref] of remote.symrefs) {
        const parts = symref.split("/");
        const last = parts.pop();
        let o = result;
        for (const part of parts) {
          o[part] = o[part] || {};
          o = o[part];
        }
        o[last] = ref;
      }
      return result;
    } catch (err) {
      err.caller = "git.getRemoteInfo";
      throw err;
    }
  }
  function formatInfoRefs(remote, prefix, symrefs, peelTags) {
    const refs = [];
    for (const [key, value] of remote.refs) {
      if (prefix && !key.startsWith(prefix))
        continue;
      if (key.endsWith("^{}")) {
        if (peelTags) {
          const _key = key.replace("^{}", "");
          const last = refs[refs.length - 1];
          const r = last.ref === _key ? last : refs.find((x) => x.ref === _key);
          if (r === undefined) {
            throw new Error("I did not expect this to happen");
          }
          r.peeled = value;
        }
        continue;
      }
      const ref = { ref: key, oid: value };
      if (symrefs) {
        if (remote.symrefs.has(key)) {
          ref.target = remote.symrefs.get(key);
        }
      }
      refs.push(ref);
    }
    return refs;
  }
  async function getRemoteInfo2({
    http,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    corsProxy,
    url,
    headers = {},
    forPush = false,
    protocolVersion = 2
  }) {
    try {
      assertParameter("http", http);
      assertParameter("url", url);
      const GitRemoteHTTP2 = GitRemoteManager.getRemoteHelperFor({ url });
      const remote = await GitRemoteHTTP2.discover({
        http,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        corsProxy,
        service: forPush ? "git-receive-pack" : "git-upload-pack",
        url,
        headers,
        protocolVersion
      });
      if (remote.protocolVersion === 2) {
        return {
          protocolVersion: remote.protocolVersion,
          capabilities: remote.capabilities2
        };
      }
      const capabilities = {};
      for (const cap of remote.capabilities) {
        const [key, value] = cap.split("=");
        if (value) {
          capabilities[key] = value;
        } else {
          capabilities[key] = true;
        }
      }
      return {
        protocolVersion: 1,
        capabilities,
        refs: formatInfoRefs(remote, undefined, true, true)
      };
    } catch (err) {
      err.caller = "git.getRemoteInfo2";
      throw err;
    }
  }
  async function hashObject({
    type,
    object,
    format = "content",
    oid = undefined
  }) {
    if (format !== "deflated") {
      if (format !== "wrapped") {
        object = GitObject.wrap({ type, object });
      }
      oid = await shasum(object);
    }
    return { oid, object };
  }
  async function hashBlob({ object }) {
    try {
      assertParameter("object", object);
      if (typeof object === "string") {
        object = Buffer.from(object, "utf8");
      } else if (!(object instanceof Uint8Array)) {
        object = new Uint8Array(object);
      }
      const type = "blob";
      const { oid, object: _object } = await hashObject({
        type,
        format: "content",
        object
      });
      return { oid, type, object: _object, format: "wrapped" };
    } catch (err) {
      err.caller = "git.hashBlob";
      throw err;
    }
  }
  async function _indexPack({
    fs,
    cache,
    onProgress,
    dir,
    gitdir,
    filepath
  }) {
    try {
      filepath = join(dir, filepath);
      const pack = await fs.read(filepath);
      const getExternalRefDelta = (oid) => _readObject({ fs, cache, gitdir, oid });
      const idx = await GitPackIndex.fromPack({
        pack,
        getExternalRefDelta,
        onProgress
      });
      await fs.write(filepath.replace(/\.pack$/, ".idx"), await idx.toBuffer());
      return {
        oids: [...idx.hashes]
      };
    } catch (err) {
      err.caller = "git.indexPack";
      throw err;
    }
  }
  async function indexPack({
    fs,
    onProgress,
    dir,
    gitdir = join(dir, ".git"),
    filepath,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("dir", dir);
      assertParameter("gitdir", dir);
      assertParameter("filepath", filepath);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _indexPack({
        fs: fsp,
        cache,
        onProgress,
        dir,
        gitdir: updatedGitdir,
        filepath
      });
    } catch (err) {
      err.caller = "git.indexPack";
      throw err;
    }
  }
  async function init({
    fs,
    bare = false,
    dir,
    gitdir = bare ? dir : join(dir, ".git"),
    defaultBranch = "master"
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      if (!bare) {
        assertParameter("dir", dir);
      }
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _init({
        fs: fsp,
        bare,
        dir,
        gitdir: updatedGitdir,
        defaultBranch
      });
    } catch (err) {
      err.caller = "git.init";
      throw err;
    }
  }
  async function _isDescendent({
    fs,
    cache,
    gitdir,
    oid,
    ancestor,
    depth
  }) {
    const shallows = await GitShallowManager.read({ fs, gitdir });
    if (!oid) {
      throw new MissingParameterError("oid");
    }
    if (!ancestor) {
      throw new MissingParameterError("ancestor");
    }
    if (oid === ancestor)
      return false;
    const queue = [oid];
    const visited = new Set;
    let searchdepth = 0;
    while (queue.length) {
      if (searchdepth++ === depth) {
        throw new MaxDepthError(depth);
      }
      const oid2 = queue.shift();
      const { type, object } = await _readObject({
        fs,
        cache,
        gitdir,
        oid: oid2
      });
      if (type !== "commit") {
        throw new ObjectTypeError(oid2, type, "commit");
      }
      const commit2 = GitCommit.from(object).parse();
      for (const parent of commit2.parent) {
        if (parent === ancestor)
          return true;
      }
      if (!shallows.has(oid2)) {
        for (const parent of commit2.parent) {
          if (!visited.has(parent)) {
            queue.push(parent);
            visited.add(parent);
          }
        }
      }
    }
    return false;
  }
  async function isDescendent({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    ancestor,
    depth = -1,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      assertParameter("ancestor", ancestor);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _isDescendent({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oid,
        ancestor,
        depth
      });
    } catch (err) {
      err.caller = "git.isDescendent";
      throw err;
    }
  }
  async function isIgnored({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("dir", dir);
      assertParameter("gitdir", gitdir);
      assertParameter("filepath", filepath);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return GitIgnoreManager.isIgnored({
        fs: fsp,
        dir,
        gitdir: updatedGitdir,
        filepath
      });
    } catch (err) {
      err.caller = "git.isIgnored";
      throw err;
    }
  }
  async function listBranches({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    remote
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return GitRefManager.listBranches({
        fs: fsp,
        gitdir: updatedGitdir,
        remote
      });
    } catch (err) {
      err.caller = "git.listBranches";
      throw err;
    }
  }
  async function _listFiles({ fs, gitdir, ref, cache }) {
    if (ref) {
      const oid = await GitRefManager.resolve({ gitdir, fs, ref });
      const filenames = [];
      await accumulateFilesFromOid({
        fs,
        cache,
        gitdir,
        oid,
        filenames,
        prefix: ""
      });
      return filenames;
    } else {
      return GitIndexManager.acquire({ fs, gitdir, cache }, async function(index2) {
        return index2.entries.map((x) => x.path);
      });
    }
  }
  async function accumulateFilesFromOid({
    fs,
    cache,
    gitdir,
    oid,
    filenames,
    prefix
  }) {
    const { tree } = await _readTree({ fs, cache, gitdir, oid });
    for (const entry of tree) {
      if (entry.type === "tree") {
        await accumulateFilesFromOid({
          fs,
          cache,
          gitdir,
          oid: entry.oid,
          filenames,
          prefix: join(prefix, entry.path)
        });
      } else {
        filenames.push(join(prefix, entry.path));
      }
    }
  }
  async function listFiles({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _listFiles({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        ref
      });
    } catch (err) {
      err.caller = "git.listFiles";
      throw err;
    }
  }
  async function _listNotes({ fs, cache, gitdir, ref }) {
    let parent;
    try {
      parent = await GitRefManager.resolve({ gitdir, fs, ref });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return [];
      }
    }
    const result = await _readTree({
      fs,
      cache,
      gitdir,
      oid: parent
    });
    const notes = result.tree.map((entry) => ({
      target: entry.path,
      note: entry.oid
    }));
    return notes;
  }
  async function listNotes({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref = "refs/notes/commits",
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _listNotes({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        ref
      });
    } catch (err) {
      err.caller = "git.listNotes";
      throw err;
    }
  }
  async function listRefs({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return GitRefManager.listRefs({ fs: fsp, gitdir: updatedGitdir, filepath });
    } catch (err) {
      err.caller = "git.listRefs";
      throw err;
    }
  }
  async function _listRemotes({ fs, gitdir }) {
    const config = await GitConfigManager.get({ fs, gitdir });
    const remoteNames = await config.getSubsections("remote");
    const remotes = Promise.all(remoteNames.map(async (remote) => {
      const url = await config.get(`remote.${remote}.url`);
      return { remote, url };
    }));
    return remotes;
  }
  async function listRemotes({ fs, dir, gitdir = join(dir, ".git") }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _listRemotes({
        fs: fsp,
        gitdir: updatedGitdir
      });
    } catch (err) {
      err.caller = "git.listRemotes";
      throw err;
    }
  }
  async function parseListRefsResponse(stream) {
    const read = GitPktLine.streamReader(stream);
    const refs = [];
    let line;
    while (true) {
      line = await read();
      if (line === true)
        break;
      if (line === null)
        continue;
      line = line.toString("utf8").replace(/\n$/, "");
      const [oid, ref, ...attrs] = line.split(" ");
      const r = { ref, oid };
      for (const attr of attrs) {
        const [name, value] = attr.split(":");
        if (name === "symref-target") {
          r.target = value;
        } else if (name === "peeled") {
          r.peeled = value;
        }
      }
      refs.push(r);
    }
    return refs;
  }
  async function writeListRefsRequest({ prefix, symrefs, peelTags }) {
    const packstream = [];
    packstream.push(GitPktLine.encode(`command=ls-refs
`));
    packstream.push(GitPktLine.encode(`agent=${pkg.agent}
`));
    if (peelTags || symrefs || prefix) {
      packstream.push(GitPktLine.delim());
    }
    if (peelTags)
      packstream.push(GitPktLine.encode("peel"));
    if (symrefs)
      packstream.push(GitPktLine.encode("symrefs"));
    if (prefix)
      packstream.push(GitPktLine.encode(`ref-prefix ${prefix}`));
    packstream.push(GitPktLine.flush());
    return packstream;
  }
  async function listServerRefs({
    http,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    corsProxy,
    url,
    headers = {},
    forPush = false,
    protocolVersion = 2,
    prefix,
    symrefs,
    peelTags
  }) {
    try {
      assertParameter("http", http);
      assertParameter("url", url);
      const remote = await GitRemoteHTTP.discover({
        http,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        corsProxy,
        service: forPush ? "git-receive-pack" : "git-upload-pack",
        url,
        headers,
        protocolVersion
      });
      if (remote.protocolVersion === 1) {
        return formatInfoRefs(remote, prefix, symrefs, peelTags);
      }
      const body = await writeListRefsRequest({ prefix, symrefs, peelTags });
      const res = await GitRemoteHTTP.connect({
        http,
        auth: remote.auth,
        headers,
        corsProxy,
        service: forPush ? "git-receive-pack" : "git-upload-pack",
        url,
        body
      });
      return parseListRefsResponse(res.body);
    } catch (err) {
      err.caller = "git.listServerRefs";
      throw err;
    }
  }
  async function listTags({ fs, dir, gitdir = join(dir, ".git") }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return GitRefManager.listTags({ fs: fsp, gitdir: updatedGitdir });
    } catch (err) {
      err.caller = "git.listTags";
      throw err;
    }
  }
  function compareAge(a, b) {
    return a.committer.timestamp - b.committer.timestamp;
  }
  var EMPTY_OID = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  async function resolveFileIdInTree({ fs, cache, gitdir, oid, fileId }) {
    if (fileId === EMPTY_OID)
      return;
    const _oid = oid;
    let filepath;
    const result = await resolveTree({ fs, cache, gitdir, oid });
    const tree = result.tree;
    if (fileId === result.oid) {
      filepath = result.path;
    } else {
      filepath = await _resolveFileId({
        fs,
        cache,
        gitdir,
        tree,
        fileId,
        oid: _oid
      });
      if (Array.isArray(filepath)) {
        if (filepath.length === 0)
          filepath = undefined;
        else if (filepath.length === 1)
          filepath = filepath[0];
      }
    }
    return filepath;
  }
  async function _resolveFileId({
    fs,
    cache,
    gitdir,
    tree,
    fileId,
    oid,
    filepaths = [],
    parentPath = ""
  }) {
    const walks = tree.entries().map(function(entry) {
      let result;
      if (entry.oid === fileId) {
        result = join(parentPath, entry.path);
        filepaths.push(result);
      } else if (entry.type === "tree") {
        result = _readObject({
          fs,
          cache,
          gitdir,
          oid: entry.oid
        }).then(function({ object }) {
          return _resolveFileId({
            fs,
            cache,
            gitdir,
            tree: GitTree.from(object),
            fileId,
            oid,
            filepaths,
            parentPath: join(parentPath, entry.path)
          });
        });
      }
      return result;
    });
    await Promise.all(walks);
    return filepaths;
  }
  async function _log({
    fs,
    cache,
    gitdir,
    filepath,
    ref,
    depth,
    since,
    force,
    follow
  }) {
    const sinceTimestamp = typeof since === "undefined" ? undefined : Math.floor(since.valueOf() / 1000);
    const commits = [];
    const shallowCommits = await GitShallowManager.read({ fs, gitdir });
    const oid = await GitRefManager.resolve({ fs, gitdir, ref });
    const tips = [await _readCommit({ fs, cache, gitdir, oid })];
    let lastFileOid;
    let lastCommit;
    let isOk;
    function endCommit(commit2) {
      if (isOk && filepath)
        commits.push(commit2);
    }
    while (tips.length > 0) {
      const commit2 = tips.pop();
      if (sinceTimestamp !== undefined && commit2.commit.committer.timestamp <= sinceTimestamp) {
        break;
      }
      if (filepath) {
        let vFileOid;
        try {
          vFileOid = await resolveFilepath({
            fs,
            cache,
            gitdir,
            oid: commit2.commit.tree,
            filepath
          });
          if (lastCommit && lastFileOid !== vFileOid) {
            commits.push(lastCommit);
          }
          lastFileOid = vFileOid;
          lastCommit = commit2;
          isOk = true;
        } catch (e) {
          if (e instanceof NotFoundError) {
            let found = follow && lastFileOid;
            if (found) {
              found = await resolveFileIdInTree({
                fs,
                cache,
                gitdir,
                oid: commit2.commit.tree,
                fileId: lastFileOid
              });
              if (found) {
                if (Array.isArray(found)) {
                  if (lastCommit) {
                    const lastFound = await resolveFileIdInTree({
                      fs,
                      cache,
                      gitdir,
                      oid: lastCommit.commit.tree,
                      fileId: lastFileOid
                    });
                    if (Array.isArray(lastFound)) {
                      found = found.filter((p) => lastFound.indexOf(p) === -1);
                      if (found.length === 1) {
                        found = found[0];
                        filepath = found;
                        if (lastCommit)
                          commits.push(lastCommit);
                      } else {
                        found = false;
                        if (lastCommit)
                          commits.push(lastCommit);
                        break;
                      }
                    }
                  }
                } else {
                  filepath = found;
                  if (lastCommit)
                    commits.push(lastCommit);
                }
              }
            }
            if (!found) {
              if (isOk && lastFileOid) {
                commits.push(lastCommit);
                if (!force)
                  break;
              }
              if (!force && !follow)
                throw e;
            }
            lastCommit = commit2;
            isOk = false;
          } else
            throw e;
        }
      } else {
        commits.push(commit2);
      }
      if (depth !== undefined && commits.length === depth) {
        endCommit(commit2);
        break;
      }
      if (!shallowCommits.has(commit2.oid)) {
        for (const oid2 of commit2.commit.parent) {
          const commit3 = await _readCommit({ fs, cache, gitdir, oid: oid2 });
          if (!tips.map((commit4) => commit4.oid).includes(commit3.oid)) {
            tips.push(commit3);
          }
        }
      }
      if (tips.length === 0) {
        endCommit(commit2);
      }
      tips.sort((a, b) => compareAge(a.commit, b.commit));
    }
    return commits;
  }
  async function log({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath,
    ref = "HEAD",
    depth,
    since,
    force,
    follow,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _log({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        filepath,
        ref,
        depth,
        since,
        force,
        follow
      });
    } catch (err) {
      err.caller = "git.log";
      throw err;
    }
  }
  async function merge({
    fs: _fs,
    onSign,
    dir,
    gitdir = join(dir, ".git"),
    ours,
    theirs,
    fastForward: fastForward2 = true,
    fastForwardOnly = false,
    dryRun = false,
    noUpdateBranch = false,
    abortOnConflict = true,
    message,
    author: _author,
    committer: _committer,
    signingKey,
    cache = {},
    mergeDriver,
    allowUnrelatedHistories = false
  }) {
    try {
      assertParameter("fs", _fs);
      if (signingKey) {
        assertParameter("onSign", onSign);
      }
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const author = await normalizeAuthorObject({
        fs,
        gitdir: updatedGitdir,
        author: _author
      });
      if (!author && (!fastForwardOnly || !fastForward2)) {
        throw new MissingNameError("author");
      }
      const committer = await normalizeCommitterObject({
        fs,
        gitdir: updatedGitdir,
        author,
        committer: _committer
      });
      if (!committer && (!fastForwardOnly || !fastForward2)) {
        throw new MissingNameError("committer");
      }
      return await _merge({
        fs,
        cache,
        dir,
        gitdir: updatedGitdir,
        ours,
        theirs,
        fastForward: fastForward2,
        fastForwardOnly,
        dryRun,
        noUpdateBranch,
        abortOnConflict,
        message,
        author,
        committer,
        signingKey,
        onSign,
        mergeDriver,
        allowUnrelatedHistories
      });
    } catch (err) {
      err.caller = "git.merge";
      throw err;
    }
  }
  var types = {
    commit: 16,
    tree: 32,
    blob: 48,
    tag: 64,
    ofs_delta: 96,
    ref_delta: 112
  };
  async function _pack({
    fs,
    cache,
    dir,
    gitdir = join(dir, ".git"),
    oids
  }) {
    const hash = new Hash;
    const outputStream = [];
    function write(chunk, enc) {
      const buff = Buffer.from(chunk, enc);
      outputStream.push(buff);
      hash.update(buff);
    }
    async function writeObject2({ stype, object }) {
      const type = types[stype];
      let length = object.length;
      let multibyte = length > 15 ? 128 : 0;
      const lastFour = length & 15;
      length = length >>> 4;
      let byte = (multibyte | type | lastFour).toString(16);
      write(byte, "hex");
      while (multibyte) {
        multibyte = length > 127 ? 128 : 0;
        byte = multibyte | length & 127;
        write(padHex(2, byte), "hex");
        length = length >>> 7;
      }
      write(Buffer.from(await deflate(object)));
    }
    write("PACK");
    write("00000002", "hex");
    write(padHex(8, oids.length), "hex");
    for (const oid of oids) {
      const { type, object } = await _readObject({ fs, cache, gitdir, oid });
      await writeObject2({ write, object, stype: type });
    }
    const digest = hash.digest();
    outputStream.push(digest);
    return outputStream;
  }
  async function _packObjects({ fs, cache, gitdir, oids, write }) {
    const buffers = await _pack({ fs, cache, gitdir, oids });
    const packfile = Buffer.from(await collect(buffers));
    const packfileSha = packfile.slice(-20).toString("hex");
    const filename = `pack-${packfileSha}.pack`;
    if (write) {
      await fs.write(join(gitdir, `objects/pack/${filename}`), packfile);
      return { filename };
    }
    return {
      filename,
      packfile: new Uint8Array(packfile)
    };
  }
  async function packObjects({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oids,
    write = false,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oids", oids);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _packObjects({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oids,
        write
      });
    } catch (err) {
      err.caller = "git.packObjects";
      throw err;
    }
  }
  async function pull({
    fs: _fs,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    url,
    remote,
    remoteRef,
    prune = false,
    pruneTags = false,
    fastForward: fastForward2 = true,
    fastForwardOnly = false,
    corsProxy,
    singleBranch,
    headers = {},
    author: _author,
    committer: _committer,
    signingKey,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const author = await normalizeAuthorObject({
        fs,
        gitdir: updatedGitdir,
        author: _author
      });
      if (!author)
        throw new MissingNameError("author");
      const committer = await normalizeCommitterObject({
        fs,
        gitdir: updatedGitdir,
        author,
        committer: _committer
      });
      if (!committer)
        throw new MissingNameError("committer");
      return await _pull({
        fs,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        dir,
        gitdir: updatedGitdir,
        ref,
        url,
        remote,
        remoteRef,
        fastForward: fastForward2,
        fastForwardOnly,
        corsProxy,
        singleBranch,
        headers,
        author,
        committer,
        signingKey,
        prune,
        pruneTags
      });
    } catch (err) {
      err.caller = "git.pull";
      throw err;
    }
  }
  async function listCommitsAndTags({
    fs,
    cache,
    dir,
    gitdir = join(dir, ".git"),
    start,
    finish
  }) {
    const shallows = await GitShallowManager.read({ fs, gitdir });
    const startingSet = new Set;
    const finishingSet = new Set;
    for (const ref of start) {
      startingSet.add(await GitRefManager.resolve({ fs, gitdir, ref }));
    }
    for (const ref of finish) {
      try {
        const oid = await GitRefManager.resolve({ fs, gitdir, ref });
        finishingSet.add(oid);
      } catch (err) {}
    }
    const visited = new Set;
    async function walk2(oid) {
      visited.add(oid);
      const { type, object } = await _readObject({ fs, cache, gitdir, oid });
      if (type === "tag") {
        const tag2 = GitAnnotatedTag.from(object);
        const commit2 = tag2.headers().object;
        return walk2(commit2);
      }
      if (type !== "commit") {
        throw new ObjectTypeError(oid, type, "commit");
      }
      if (!shallows.has(oid)) {
        const commit2 = GitCommit.from(object);
        const parents = commit2.headers().parent;
        for (oid of parents) {
          if (!finishingSet.has(oid) && !visited.has(oid)) {
            await walk2(oid);
          }
        }
      }
    }
    for (const oid of startingSet) {
      await walk2(oid);
    }
    return visited;
  }
  async function listObjects({
    fs,
    cache,
    dir,
    gitdir = join(dir, ".git"),
    oids
  }) {
    const visited = new Set;
    async function walk2(oid) {
      if (visited.has(oid))
        return;
      visited.add(oid);
      const { type, object } = await _readObject({ fs, cache, gitdir, oid });
      if (type === "tag") {
        const tag2 = GitAnnotatedTag.from(object);
        const obj = tag2.headers().object;
        await walk2(obj);
      } else if (type === "commit") {
        const commit2 = GitCommit.from(object);
        const tree = commit2.headers().tree;
        await walk2(tree);
      } else if (type === "tree") {
        const tree = GitTree.from(object);
        for (const entry of tree) {
          if (entry.type === "blob") {
            visited.add(entry.oid);
          }
          if (entry.type === "tree") {
            await walk2(entry.oid);
          }
        }
      }
    }
    for (const oid of oids) {
      await walk2(oid);
    }
    return visited;
  }
  async function parseReceivePackResponse(packfile) {
    const result = {};
    let response = "";
    const read = GitPktLine.streamReader(packfile);
    let line = await read();
    while (line !== true) {
      if (line !== null)
        response += line.toString("utf8") + `
`;
      line = await read();
    }
    const lines = response.toString("utf8").split(`
`);
    line = lines.shift();
    if (!line.startsWith("unpack ")) {
      throw new ParseError('unpack ok" or "unpack [error message]', line);
    }
    result.ok = line === "unpack ok";
    if (!result.ok) {
      result.error = line.slice("unpack ".length);
    }
    result.refs = {};
    for (const line2 of lines) {
      if (line2.trim() === "")
        continue;
      const status2 = line2.slice(0, 2);
      const refAndMessage = line2.slice(3);
      let space = refAndMessage.indexOf(" ");
      if (space === -1)
        space = refAndMessage.length;
      const ref = refAndMessage.slice(0, space);
      const error = refAndMessage.slice(space + 1);
      result.refs[ref] = {
        ok: status2 === "ok",
        error
      };
    }
    return result;
  }
  async function writeReceivePackRequest({
    capabilities = [],
    triplets = []
  }) {
    const packstream = [];
    let capsFirstLine = `\x00 ${capabilities.join(" ")}`;
    for (const trip of triplets) {
      packstream.push(GitPktLine.encode(`${trip.oldoid} ${trip.oid} ${trip.fullRef}${capsFirstLine}
`));
      capsFirstLine = "";
    }
    packstream.push(GitPktLine.flush());
    return packstream;
  }
  async function _push({
    fs,
    cache,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    onPrePush,
    gitdir,
    ref: _ref,
    remoteRef: _remoteRef,
    remote,
    url: _url,
    force = false,
    delete: _delete = false,
    corsProxy,
    headers = {}
  }) {
    const ref = _ref || await _currentBranch({ fs, gitdir });
    if (typeof ref === "undefined") {
      throw new MissingParameterError("ref");
    }
    const config = await GitConfigManager.get({ fs, gitdir });
    remote = remote || await config.get(`branch.${ref}.pushRemote`) || await config.get("remote.pushDefault") || await config.get(`branch.${ref}.remote`) || "origin";
    const url = _url || await config.get(`remote.${remote}.pushurl`) || await config.get(`remote.${remote}.url`);
    if (typeof url === "undefined") {
      throw new MissingParameterError("remote OR url");
    }
    const remoteRef = _remoteRef || await config.get(`branch.${ref}.merge`);
    if (typeof url === "undefined") {
      throw new MissingParameterError("remoteRef");
    }
    if (corsProxy === undefined) {
      corsProxy = await config.get("http.corsProxy");
    }
    const fullRef = await GitRefManager.expand({ fs, gitdir, ref });
    const oid = _delete ? "0000000000000000000000000000000000000000" : await GitRefManager.resolve({ fs, gitdir, ref: fullRef });
    const GitRemoteHTTP2 = GitRemoteManager.getRemoteHelperFor({ url });
    const httpRemote = await GitRemoteHTTP2.discover({
      http,
      onAuth,
      onAuthSuccess,
      onAuthFailure,
      corsProxy,
      service: "git-receive-pack",
      url,
      headers,
      protocolVersion: 1
    });
    const auth = httpRemote.auth;
    let fullRemoteRef;
    if (!remoteRef) {
      fullRemoteRef = fullRef;
    } else {
      try {
        fullRemoteRef = await GitRefManager.expandAgainstMap({
          ref: remoteRef,
          map: httpRemote.refs
        });
      } catch (err) {
        if (err instanceof NotFoundError) {
          fullRemoteRef = remoteRef.startsWith("refs/") ? remoteRef : `refs/heads/${remoteRef}`;
        } else {
          throw err;
        }
      }
    }
    const oldoid = httpRemote.refs.get(fullRemoteRef) || "0000000000000000000000000000000000000000";
    if (onPrePush) {
      const hookCancel = await onPrePush({
        remote,
        url,
        localRef: { ref: _delete ? "(delete)" : fullRef, oid },
        remoteRef: { ref: fullRemoteRef, oid: oldoid }
      });
      if (!hookCancel)
        throw new UserCanceledError;
    }
    const thinPack = !httpRemote.capabilities.has("no-thin");
    let objects = new Set;
    if (!_delete) {
      const finish = [...httpRemote.refs.values()];
      let skipObjects = new Set;
      if (oldoid !== "0000000000000000000000000000000000000000") {
        const mergebase = await _findMergeBase({
          fs,
          cache,
          gitdir,
          oids: [oid, oldoid]
        });
        for (const oid2 of mergebase)
          finish.push(oid2);
        if (thinPack) {
          skipObjects = await listObjects({ fs, cache, gitdir, oids: mergebase });
        }
      }
      if (!finish.includes(oid)) {
        const commits = await listCommitsAndTags({
          fs,
          cache,
          gitdir,
          start: [oid],
          finish
        });
        objects = await listObjects({ fs, cache, gitdir, oids: commits });
      }
      if (thinPack) {
        try {
          const ref2 = await GitRefManager.resolve({
            fs,
            gitdir,
            ref: `refs/remotes/${remote}/HEAD`,
            depth: 2
          });
          const { oid: oid2 } = await GitRefManager.resolveAgainstMap({
            ref: ref2.replace(`refs/remotes/${remote}/`, ""),
            fullref: ref2,
            map: httpRemote.refs
          });
          const oids = [oid2];
          for (const oid3 of await listObjects({ fs, cache, gitdir, oids })) {
            skipObjects.add(oid3);
          }
        } catch (e) {}
        for (const oid2 of skipObjects) {
          objects.delete(oid2);
        }
      }
      if (oid === oldoid)
        force = true;
      if (!force) {
        if (fullRef.startsWith("refs/tags") && oldoid !== "0000000000000000000000000000000000000000") {
          throw new PushRejectedError("tag-exists");
        }
        if (oid !== "0000000000000000000000000000000000000000" && oldoid !== "0000000000000000000000000000000000000000" && !await _isDescendent({
          fs,
          cache,
          gitdir,
          oid,
          ancestor: oldoid,
          depth: -1
        })) {
          throw new PushRejectedError("not-fast-forward");
        }
      }
    }
    const capabilities = filterCapabilities([...httpRemote.capabilities], ["report-status", "side-band-64k", `agent=${pkg.agent}`]);
    const packstream1 = await writeReceivePackRequest({
      capabilities,
      triplets: [{ oldoid, oid, fullRef: fullRemoteRef }]
    });
    const packstream2 = _delete ? [] : await _pack({
      fs,
      cache,
      gitdir,
      oids: [...objects]
    });
    const res = await GitRemoteHTTP2.connect({
      http,
      onProgress,
      corsProxy,
      service: "git-receive-pack",
      url,
      auth,
      headers,
      body: [...packstream1, ...packstream2]
    });
    const { packfile, progress } = await GitSideBand.demux(res.body);
    if (onMessage) {
      const lines = splitLines(progress);
      forAwait(lines, async (line) => {
        await onMessage(line);
      });
    }
    const result = await parseReceivePackResponse(packfile);
    if (res.headers) {
      result.headers = res.headers;
    }
    if (remote && result.ok && result.refs[fullRemoteRef].ok && !fullRef.startsWith("refs/tags")) {
      const ref2 = `refs/remotes/${remote}/${fullRemoteRef.replace("refs/heads", "")}`;
      if (_delete) {
        await GitRefManager.deleteRef({ fs, gitdir, ref: ref2 });
      } else {
        await GitRefManager.writeRef({ fs, gitdir, ref: ref2, value: oid });
      }
    }
    if (result.ok && Object.values(result.refs).every((result2) => result2.ok)) {
      return result;
    } else {
      const prettyDetails = Object.entries(result.refs).filter(([k, v]) => !v.ok).map(([k, v]) => `
  - ${k}: ${v.error}`).join("");
      throw new GitPushError(prettyDetails, result);
    }
  }
  async function push({
    fs,
    http,
    onProgress,
    onMessage,
    onAuth,
    onAuthSuccess,
    onAuthFailure,
    onPrePush,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    remoteRef,
    remote = "origin",
    url,
    force = false,
    delete: _delete = false,
    corsProxy,
    headers = {},
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("http", http);
      assertParameter("gitdir", gitdir);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _push({
        fs: fsp,
        cache,
        http,
        onProgress,
        onMessage,
        onAuth,
        onAuthSuccess,
        onAuthFailure,
        onPrePush,
        gitdir: updatedGitdir,
        ref,
        remoteRef,
        remote,
        url,
        force,
        delete: _delete,
        corsProxy,
        headers
      });
    } catch (err) {
      err.caller = "git.push";
      throw err;
    }
  }
  async function resolveBlob({ fs, cache, gitdir, oid }) {
    const { type, object } = await _readObject({ fs, cache, gitdir, oid });
    if (type === "tag") {
      oid = GitAnnotatedTag.from(object).parse().object;
      return resolveBlob({ fs, cache, gitdir, oid });
    }
    if (type !== "blob") {
      throw new ObjectTypeError(oid, type, "blob");
    }
    return { oid, blob: new Uint8Array(object) };
  }
  async function _readBlob({
    fs,
    cache,
    gitdir,
    oid,
    filepath = undefined
  }) {
    if (filepath !== undefined) {
      oid = await resolveFilepath({ fs, cache, gitdir, oid, filepath });
    }
    const blob = await resolveBlob({
      fs,
      cache,
      gitdir,
      oid
    });
    return blob;
  }
  async function readBlob({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    filepath,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _readBlob({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oid,
        filepath
      });
    } catch (err) {
      err.caller = "git.readBlob";
      throw err;
    }
  }
  async function readCommit({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _readCommit({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oid
      });
    } catch (err) {
      err.caller = "git.readCommit";
      throw err;
    }
  }
  async function _readNote({
    fs,
    cache,
    gitdir,
    ref = "refs/notes/commits",
    oid
  }) {
    const parent = await GitRefManager.resolve({ gitdir, fs, ref });
    const { blob } = await _readBlob({
      fs,
      cache,
      gitdir,
      oid: parent,
      filepath: oid
    });
    return blob;
  }
  async function readNote({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref = "refs/notes/commits",
    oid,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      assertParameter("oid", oid);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _readNote({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        ref,
        oid
      });
    } catch (err) {
      err.caller = "git.readNote";
      throw err;
    }
  }
  async function readObject({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    format = "parsed",
    filepath = undefined,
    encoding = undefined,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      if (filepath !== undefined) {
        oid = await resolveFilepath({
          fs,
          cache,
          gitdir: updatedGitdir,
          oid,
          filepath
        });
      }
      const _format = format === "parsed" ? "content" : format;
      const result = await _readObject({
        fs,
        cache,
        gitdir: updatedGitdir,
        oid,
        format: _format
      });
      result.oid = oid;
      if (format === "parsed") {
        result.format = "parsed";
        switch (result.type) {
          case "commit":
            result.object = GitCommit.from(result.object).parse();
            break;
          case "tree":
            result.object = GitTree.from(result.object).entries();
            break;
          case "blob":
            if (encoding) {
              result.object = result.object.toString(encoding);
            } else {
              result.object = new Uint8Array(result.object);
              result.format = "content";
            }
            break;
          case "tag":
            result.object = GitAnnotatedTag.from(result.object).parse();
            break;
          default:
            throw new ObjectTypeError(result.oid, result.type, "blob|commit|tag|tree");
        }
      } else if (result.format === "deflated" || result.format === "wrapped") {
        result.type = result.format;
      }
      return result;
    } catch (err) {
      err.caller = "git.readObject";
      throw err;
    }
  }
  async function _readTag({ fs, cache, gitdir, oid }) {
    const { type, object } = await _readObject({
      fs,
      cache,
      gitdir,
      oid,
      format: "content"
    });
    if (type !== "tag") {
      throw new ObjectTypeError(oid, type, "tag");
    }
    const tag2 = GitAnnotatedTag.from(object);
    const result = {
      oid,
      tag: tag2.parse(),
      payload: tag2.payload()
    };
    return result;
  }
  async function readTag({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _readTag({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oid
      });
    } catch (err) {
      err.caller = "git.readTag";
      throw err;
    }
  }
  async function readTree({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    oid,
    filepath = undefined,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _readTree({
        fs: fsp,
        cache,
        gitdir: updatedGitdir,
        oid,
        filepath
      });
    } catch (err) {
      err.caller = "git.readTree";
      throw err;
    }
  }
  async function remove({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("filepath", filepath);
      const fsp = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      await GitIndexManager.acquire({ fs: fsp, gitdir: updatedGitdir, cache }, async function(index2) {
        index2.delete({ filepath });
      });
    } catch (err) {
      err.caller = "git.remove";
      throw err;
    }
  }
  async function _removeNote({
    fs,
    cache,
    onSign,
    gitdir,
    ref = "refs/notes/commits",
    oid,
    author,
    committer,
    signingKey
  }) {
    let parent;
    try {
      parent = await GitRefManager.resolve({ gitdir, fs, ref });
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        throw err;
      }
    }
    const result = await _readTree({
      fs,
      cache,
      gitdir,
      oid: parent || "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    });
    let tree = result.tree;
    tree = tree.filter((entry) => entry.path !== oid);
    const treeOid = await _writeTree({
      fs,
      gitdir,
      tree
    });
    const commitOid = await _commit({
      fs,
      cache,
      onSign,
      gitdir,
      ref,
      tree: treeOid,
      parent: parent && [parent],
      message: `Note removed by 'isomorphic-git removeNote'
`,
      author,
      committer,
      signingKey
    });
    return commitOid;
  }
  async function removeNote({
    fs: _fs,
    onSign,
    dir,
    gitdir = join(dir, ".git"),
    ref = "refs/notes/commits",
    oid,
    author: _author,
    committer: _committer,
    signingKey,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("oid", oid);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const author = await normalizeAuthorObject({
        fs,
        gitdir: updatedGitdir,
        author: _author
      });
      if (!author)
        throw new MissingNameError("author");
      const committer = await normalizeCommitterObject({
        fs,
        gitdir: updatedGitdir,
        author,
        committer: _committer
      });
      if (!committer)
        throw new MissingNameError("committer");
      return await _removeNote({
        fs,
        cache,
        onSign,
        gitdir: updatedGitdir,
        ref,
        oid,
        author,
        committer,
        signingKey
      });
    } catch (err) {
      err.caller = "git.removeNote";
      throw err;
    }
  }
  async function _renameBranch({
    fs,
    gitdir,
    oldref,
    ref,
    checkout: checkout2 = false
  }) {
    if (!isValidRef(ref, true)) {
      throw new InvalidRefNameError(ref, cleanGitRef.clean(ref));
    }
    if (!isValidRef(oldref, true)) {
      throw new InvalidRefNameError(oldref, cleanGitRef.clean(oldref));
    }
    const fulloldref = `refs/heads/${oldref}`;
    const fullnewref = `refs/heads/${ref}`;
    const newexist = await GitRefManager.exists({ fs, gitdir, ref: fullnewref });
    if (newexist) {
      throw new AlreadyExistsError("branch", ref, false);
    }
    const value = await GitRefManager.resolve({
      fs,
      gitdir,
      ref: fulloldref,
      depth: 1
    });
    await GitRefManager.writeRef({ fs, gitdir, ref: fullnewref, value });
    await GitRefManager.deleteRef({ fs, gitdir, ref: fulloldref });
    const fullCurrentBranchRef = await _currentBranch({
      fs,
      gitdir,
      fullname: true
    });
    const isCurrentBranch = fullCurrentBranchRef === fulloldref;
    if (checkout2 || isCurrentBranch) {
      await GitRefManager.writeSymbolicRef({
        fs,
        gitdir,
        ref: "HEAD",
        value: fullnewref
      });
    }
  }
  async function renameBranch({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    oldref,
    checkout: checkout2 = false
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      assertParameter("oldref", oldref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _renameBranch({
        fs: fsp,
        gitdir: updatedGitdir,
        ref,
        oldref,
        checkout: checkout2
      });
    } catch (err) {
      err.caller = "git.renameBranch";
      throw err;
    }
  }
  async function hashObject$1({ gitdir, type, object }) {
    return shasum(GitObject.wrap({ type, object }));
  }
  async function resetIndex({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath,
    ref,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("filepath", filepath);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      let oid;
      let workdirOid;
      try {
        oid = await GitRefManager.resolve({
          fs,
          gitdir: updatedGitdir,
          ref: ref || "HEAD"
        });
      } catch (e) {
        if (ref) {
          throw e;
        }
      }
      if (oid) {
        try {
          oid = await resolveFilepath({
            fs,
            cache,
            gitdir: updatedGitdir,
            oid,
            filepath
          });
        } catch (e) {
          oid = null;
        }
      }
      let stats = {
        ctime: new Date(0),
        mtime: new Date(0),
        dev: 0,
        ino: 0,
        mode: 0,
        uid: 0,
        gid: 0,
        size: 0
      };
      const object = dir && await fs.read(join(dir, filepath));
      if (object) {
        workdirOid = await hashObject$1({
          gitdir: updatedGitdir,
          type: "blob",
          object
        });
        if (oid === workdirOid) {
          stats = await fs.lstat(join(dir, filepath));
        }
      }
      await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
        index2.delete({ filepath });
        if (oid) {
          index2.insert({ filepath, stats, oid });
        }
      });
    } catch (err) {
      err.caller = "git.reset";
      throw err;
    }
  }
  async function resolveRef({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    depth
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      const oid = await GitRefManager.resolve({
        fs: fsp,
        gitdir: updatedGitdir,
        ref,
        depth
      });
      return oid;
    } catch (err) {
      err.caller = "git.resolveRef";
      throw err;
    }
  }
  async function setConfig({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    path,
    value,
    append = false
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("path", path);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const config = await GitConfigManager.get({ fs, gitdir: updatedGitdir });
      if (append) {
        await config.append(path, value);
      } else {
        await config.set(path, value);
      }
      await GitConfigManager.save({ fs, gitdir: updatedGitdir, config });
    } catch (err) {
      err.caller = "git.setConfig";
      throw err;
    }
  }
  async function _writeCommit({ fs, gitdir, commit: commit2 }) {
    const object = GitCommit.from(commit2).toObject();
    const oid = await _writeObject({
      fs,
      gitdir,
      type: "commit",
      object,
      format: "content"
    });
    return oid;
  }

  class GitRefStash {
    static get timezoneOffsetForRefLogEntry() {
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
      const offsetMinutesFormatted = Math.abs(offsetMinutes % 60).toString().padStart(2, "0");
      const sign = offsetMinutes > 0 ? "-" : "+";
      return `${sign}${offsetHours.toString().padStart(2, "0")}${offsetMinutesFormatted}`;
    }
    static createStashReflogEntry(author, stashCommit, message) {
      const nameNoSpace = author.name.replace(/\s/g, "");
      const z40 = "0000000000000000000000000000000000000000";
      const timestamp = Math.floor(Date.now() / 1000);
      const timezoneOffset = GitRefStash.timezoneOffsetForRefLogEntry;
      return `${z40} ${stashCommit} ${nameNoSpace} ${author.email} ${timestamp} ${timezoneOffset}	${message}
`;
    }
    static getStashReflogEntry(reflogString, parsed = false) {
      const reflogLines = reflogString.split(`
`);
      const entries = reflogLines.filter((l) => l).reverse().map((line, idx) => parsed ? `stash@{${idx}}: ${line.split("\t")[1]}` : line);
      return entries;
    }
  }
  var _TreeMap = {
    stage: STAGE,
    workdir: WORKDIR
  };
  var lock$3;
  async function acquireLock$1(ref, callback) {
    if (lock$3 === undefined)
      lock$3 = new AsyncLock;
    return lock$3.acquire(ref, callback);
  }
  async function checkAndWriteBlob(fs, gitdir, dir, filepath, oid = null) {
    const currentFilepath = join(dir, filepath);
    const stats = await fs.lstat(currentFilepath);
    if (!stats)
      throw new NotFoundError(currentFilepath);
    if (stats.isDirectory())
      throw new InternalError(`${currentFilepath}: file expected, but found directory`);
    const objContent = oid ? await readObjectLoose({ fs, gitdir, oid }) : undefined;
    let retOid = objContent ? oid : undefined;
    if (!objContent) {
      await acquireLock$1({ fs, gitdir, currentFilepath }, async () => {
        const object = stats.isSymbolicLink() ? await fs.readlink(currentFilepath).then(posixifyPathBuffer) : await fs.read(currentFilepath);
        if (object === null)
          throw new NotFoundError(currentFilepath);
        retOid = await _writeObject({ fs, gitdir, type: "blob", object });
      });
    }
    return retOid;
  }
  async function processTreeEntries({ fs, dir, gitdir, entries }) {
    async function processTreeEntry(entry) {
      if (entry.type === "tree") {
        if (!entry.oid) {
          const children = await Promise.all(entry.children.map(processTreeEntry));
          entry.oid = await _writeTree({
            fs,
            gitdir,
            tree: children
          });
          entry.mode = 16384;
        }
      } else if (entry.type === "blob") {
        entry.oid = await checkAndWriteBlob(fs, gitdir, dir, entry.path, entry.oid);
        entry.mode = 33188;
      }
      entry.path = entry.path.split("/").pop();
      return entry;
    }
    return Promise.all(entries.map(processTreeEntry));
  }
  async function writeTreeChanges({
    fs,
    dir,
    gitdir,
    treePair
  }) {
    const isStage = treePair[1] === "stage";
    const trees = treePair.map((t) => typeof t === "string" ? _TreeMap[t]() : t);
    const changedEntries = [];
    const map = async (filepath, [head, stage]) => {
      if (filepath === "." || await GitIgnoreManager.isIgnored({ fs, dir, gitdir, filepath })) {
        return;
      }
      if (stage) {
        if (!head || await head.oid() !== await stage.oid() && await stage.oid() !== undefined) {
          changedEntries.push([head, stage]);
        }
        return {
          mode: await stage.mode(),
          path: filepath,
          oid: await stage.oid(),
          type: await stage.type()
        };
      }
    };
    const reduce = async (parent, children) => {
      children = children.filter(Boolean);
      if (!parent) {
        return children.length > 0 ? children : undefined;
      } else {
        parent.children = children;
        return parent;
      }
    };
    const iterate = async (walk2, children) => {
      const filtered = [];
      for (const child of children) {
        const [head, stage] = child;
        if (isStage) {
          if (stage) {
            if (await fs.exists(`${dir}/${stage.toString()}`)) {
              filtered.push(child);
            } else {
              changedEntries.push([null, stage]);
            }
          }
        } else if (head) {
          if (!stage) {
            changedEntries.push([head, null]);
          } else {
            filtered.push(child);
          }
        }
      }
      return filtered.length ? Promise.all(filtered.map(walk2)) : [];
    };
    const entries = await _walk({
      fs,
      cache: {},
      dir,
      gitdir,
      trees,
      map,
      reduce,
      iterate
    });
    if (changedEntries.length === 0 || entries.length === 0) {
      return null;
    }
    const processedEntries = await processTreeEntries({
      fs,
      dir,
      gitdir,
      entries
    });
    const treeEntries = processedEntries.filter(Boolean).map((entry) => ({
      mode: entry.mode,
      path: entry.path,
      oid: entry.oid,
      type: entry.type
    }));
    return _writeTree({ fs, gitdir, tree: treeEntries });
  }
  async function applyTreeChanges({
    fs,
    dir,
    gitdir,
    stashCommit,
    parentCommit,
    wasStaged
  }) {
    const dirRemoved = [];
    const stageUpdated = [];
    const ops = await _walk({
      fs,
      cache: {},
      dir,
      gitdir,
      trees: [TREE({ ref: parentCommit }), TREE({ ref: stashCommit })],
      map: async (filepath, [parent, stash2]) => {
        if (filepath === "." || await GitIgnoreManager.isIgnored({ fs, dir, gitdir, filepath })) {
          return;
        }
        const type = stash2 ? await stash2.type() : await parent.type();
        if (type !== "tree" && type !== "blob") {
          return;
        }
        if (!stash2 && parent) {
          const method = type === "tree" ? "rmdir" : "rm";
          if (type === "tree")
            dirRemoved.push(filepath);
          if (type === "blob" && wasStaged)
            stageUpdated.push({ filepath, oid: await parent.oid() });
          return { method, filepath };
        }
        const oid = await stash2.oid();
        if (!parent || await parent.oid() !== oid) {
          if (type === "tree") {
            return { method: "mkdir", filepath };
          } else {
            if (wasStaged)
              stageUpdated.push({
                filepath,
                oid,
                stats: await fs.lstat(join(dir, filepath))
              });
            return {
              method: "write",
              filepath,
              oid
            };
          }
        }
      }
    });
    await acquireLock$1({ fs, gitdir, dirRemoved, ops }, async () => {
      for (const op of ops) {
        const currentFilepath = join(dir, op.filepath);
        switch (op.method) {
          case "rmdir":
            await fs.rmdir(currentFilepath);
            break;
          case "mkdir":
            await fs.mkdir(currentFilepath);
            break;
          case "rm":
            await fs.rm(currentFilepath);
            break;
          case "write":
            if (!dirRemoved.some((removedDir) => currentFilepath.startsWith(removedDir))) {
              const { object } = await _readObject({
                fs,
                cache: {},
                gitdir,
                oid: op.oid
              });
              if (await fs.exists(currentFilepath)) {
                await fs.rm(currentFilepath);
              }
              await fs.write(currentFilepath, object);
            }
            break;
        }
      }
    });
    await GitIndexManager.acquire({ fs, gitdir, cache: {} }, async (index2) => {
      stageUpdated.forEach(({ filepath, stats, oid }) => {
        index2.insert({ filepath, stats, oid });
      });
    });
  }

  class GitStashManager {
    constructor({ fs, dir, gitdir = join(dir, ".git") }) {
      Object.assign(this, {
        fs,
        dir,
        gitdir,
        _author: null
      });
    }
    static get refStash() {
      return "refs/stash";
    }
    static get refLogsStash() {
      return "logs/refs/stash";
    }
    get refStashPath() {
      return join(this.gitdir, GitStashManager.refStash);
    }
    get refLogsStashPath() {
      return join(this.gitdir, GitStashManager.refLogsStash);
    }
    async getAuthor() {
      if (!this._author) {
        this._author = await normalizeAuthorObject({
          fs: this.fs,
          gitdir: this.gitdir,
          author: {}
        });
        if (!this._author)
          throw new MissingNameError("author");
      }
      return this._author;
    }
    async getStashSHA(refIdx, stashEntries) {
      if (!await this.fs.exists(this.refStashPath)) {
        return null;
      }
      const entries = stashEntries || await this.readStashReflogs({ parsed: false });
      return entries[refIdx].split(" ")[1];
    }
    async writeStashCommit({ message, tree, parent }) {
      return _writeCommit({
        fs: this.fs,
        gitdir: this.gitdir,
        commit: {
          message,
          tree,
          parent,
          author: await this.getAuthor(),
          committer: await this.getAuthor()
        }
      });
    }
    async readStashCommit(refIdx) {
      const stashEntries = await this.readStashReflogs({ parsed: false });
      if (refIdx !== 0) {
        if (refIdx < 0 || refIdx > stashEntries.length - 1) {
          throw new InvalidRefNameError(`stash@${refIdx}`, "number that is in range of [0, num of stash pushed]");
        }
      }
      const stashSHA = await this.getStashSHA(refIdx, stashEntries);
      if (!stashSHA) {
        return {};
      }
      return _readCommit({
        fs: this.fs,
        cache: {},
        gitdir: this.gitdir,
        oid: stashSHA
      });
    }
    async writeStashRef(stashCommit) {
      return GitRefManager.writeRef({
        fs: this.fs,
        gitdir: this.gitdir,
        ref: GitStashManager.refStash,
        value: stashCommit
      });
    }
    async writeStashReflogEntry({ stashCommit, message }) {
      const author = await this.getAuthor();
      const entry = GitRefStash.createStashReflogEntry(author, stashCommit, message);
      const filepath = this.refLogsStashPath;
      await acquireLock$1({ filepath, entry }, async () => {
        const appendTo = await this.fs.exists(filepath) ? await this.fs.read(filepath, "utf8") : "";
        await this.fs.write(filepath, appendTo + entry, "utf8");
      });
    }
    async readStashReflogs({ parsed = false }) {
      if (!await this.fs.exists(this.refLogsStashPath)) {
        return [];
      }
      const reflogString = await this.fs.read(this.refLogsStashPath, "utf8");
      return GitRefStash.getStashReflogEntry(reflogString, parsed);
    }
  }
  async function _createStashCommit({ fs, dir, gitdir, message = "" }) {
    const stashMgr = new GitStashManager({ fs, dir, gitdir });
    await stashMgr.getAuthor();
    const branch2 = await _currentBranch({
      fs,
      gitdir,
      fullname: false
    });
    const headCommit = await GitRefManager.resolve({
      fs,
      gitdir,
      ref: "HEAD"
    });
    const headCommitObj = await readCommit({ fs, dir, gitdir, oid: headCommit });
    const headMsg = headCommitObj.commit.message;
    const stashCommitParents = [headCommit];
    let stashCommitTree = null;
    let workDirCompareBase = TREE({ ref: "HEAD" });
    const indexTree = await writeTreeChanges({
      fs,
      dir,
      gitdir,
      treePair: [TREE({ ref: "HEAD" }), "stage"]
    });
    if (indexTree) {
      const stashCommitOne = await stashMgr.writeStashCommit({
        message: `stash-Index: WIP on ${branch2} - ${new Date().toISOString()}`,
        tree: indexTree,
        parent: stashCommitParents
      });
      stashCommitParents.push(stashCommitOne);
      stashCommitTree = indexTree;
      workDirCompareBase = STAGE();
    }
    const workingTree = await writeTreeChanges({
      fs,
      dir,
      gitdir,
      treePair: [workDirCompareBase, "workdir"]
    });
    if (workingTree) {
      const workingHeadCommit = await stashMgr.writeStashCommit({
        message: `stash-WorkDir: WIP on ${branch2} - ${new Date().toISOString()}`,
        tree: workingTree,
        parent: [stashCommitParents[stashCommitParents.length - 1]]
      });
      stashCommitParents.push(workingHeadCommit);
      stashCommitTree = workingTree;
    }
    if (!stashCommitTree || !indexTree && !workingTree) {
      throw new NotFoundError("changes, nothing to stash");
    }
    const stashMsg = (message.trim() || `WIP on ${branch2}`) + `: ${headCommit.substring(0, 7)} ${headMsg}`;
    const stashCommit = await stashMgr.writeStashCommit({
      message: stashMsg,
      tree: stashCommitTree,
      parent: stashCommitParents
    });
    return { stashCommit, stashMsg, branch: branch2, stashMgr };
  }
  async function _stashPush({ fs, dir, gitdir, message = "" }) {
    const { stashCommit, stashMsg, branch: branch2, stashMgr } = await _createStashCommit({
      fs,
      dir,
      gitdir,
      message
    });
    await stashMgr.writeStashRef(stashCommit);
    await stashMgr.writeStashReflogEntry({
      stashCommit,
      message: stashMsg
    });
    await checkout({
      fs,
      dir,
      gitdir,
      ref: branch2,
      track: false,
      force: true
    });
    return stashCommit;
  }
  async function _stashCreate({ fs, dir, gitdir, message = "" }) {
    const { stashCommit } = await _createStashCommit({
      fs,
      dir,
      gitdir,
      message
    });
    return stashCommit;
  }
  async function _stashApply({ fs, dir, gitdir, refIdx = 0 }) {
    const stashMgr = new GitStashManager({ fs, dir, gitdir });
    const stashCommit = await stashMgr.readStashCommit(refIdx);
    const { parent: stashParents = null } = stashCommit.commit ? stashCommit.commit : {};
    if (!stashParents || !Array.isArray(stashParents)) {
      return;
    }
    for (let i = 0;i < stashParents.length - 1; i++) {
      const applyingCommit = await _readCommit({
        fs,
        cache: {},
        gitdir,
        oid: stashParents[i + 1]
      });
      const wasStaged = applyingCommit.commit.message.startsWith("stash-Index");
      await applyTreeChanges({
        fs,
        dir,
        gitdir,
        stashCommit: stashParents[i + 1],
        parentCommit: stashParents[i],
        wasStaged
      });
    }
  }
  async function _stashDrop({ fs, dir, gitdir, refIdx = 0 }) {
    const stashMgr = new GitStashManager({ fs, dir, gitdir });
    const stashCommit = await stashMgr.readStashCommit(refIdx);
    if (!stashCommit.commit) {
      return;
    }
    const stashRefPath = stashMgr.refStashPath;
    await acquireLock$1(stashRefPath, async () => {
      if (await fs.exists(stashRefPath)) {
        await fs.rm(stashRefPath);
      }
    });
    const reflogEntries = await stashMgr.readStashReflogs({ parsed: false });
    if (!reflogEntries.length) {
      return;
    }
    reflogEntries.splice(refIdx, 1);
    const stashReflogPath = stashMgr.refLogsStashPath;
    await acquireLock$1({ reflogEntries, stashReflogPath, stashMgr }, async () => {
      if (reflogEntries.length) {
        await fs.write(stashReflogPath, reflogEntries.reverse().join(`
`) + `
`, "utf8");
        const lastStashCommit = reflogEntries[reflogEntries.length - 1].split(" ")[1];
        await stashMgr.writeStashRef(lastStashCommit);
      } else {
        await fs.rm(stashReflogPath);
      }
    });
  }
  async function _stashList({ fs, dir, gitdir }) {
    const stashMgr = new GitStashManager({ fs, dir, gitdir });
    return stashMgr.readStashReflogs({ parsed: true });
  }
  async function _stashClear({ fs, dir, gitdir }) {
    const stashMgr = new GitStashManager({ fs, dir, gitdir });
    const stashRefPath = [stashMgr.refStashPath, stashMgr.refLogsStashPath];
    await acquireLock$1(stashRefPath, async () => {
      await Promise.all(stashRefPath.map(async (path) => {
        if (await fs.exists(path)) {
          return fs.rm(path);
        }
      }));
    });
  }
  async function _stashPop({ fs, dir, gitdir, refIdx = 0 }) {
    await _stashApply({ fs, dir, gitdir, refIdx });
    await _stashDrop({ fs, dir, gitdir, refIdx });
  }
  async function stash({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    op = "push",
    message = "",
    refIdx = 0
  }) {
    assertParameter("fs", fs);
    assertParameter("dir", dir);
    assertParameter("gitdir", gitdir);
    assertParameter("op", op);
    const stashMap = {
      push: _stashPush,
      apply: _stashApply,
      drop: _stashDrop,
      list: _stashList,
      clear: _stashClear,
      pop: _stashPop,
      create: _stashCreate
    };
    const opsNeedRefIdx = ["apply", "drop", "pop"];
    try {
      const _fs = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp: _fs, dotgit: gitdir });
      const folders = ["refs", "logs", "logs/refs"];
      folders.map((f) => join(updatedGitdir, f)).forEach(async (folder) => {
        if (!await _fs.exists(folder)) {
          await _fs.mkdir(folder);
        }
      });
      const opFunc = stashMap[op];
      if (opFunc) {
        if (opsNeedRefIdx.includes(op) && refIdx < 0) {
          throw new InvalidRefNameError(`stash@${refIdx}`, "number that is in range of [0, num of stash pushed]");
        }
        return await opFunc({
          fs: _fs,
          dir,
          gitdir: updatedGitdir,
          message,
          refIdx
        });
      }
      throw new Error(`To be implemented: ${op}`);
    } catch (err) {
      err.caller = "git.stash";
      throw err;
    }
  }
  async function status({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    filepath,
    cache = {}
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("filepath", filepath);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const ignored = await GitIgnoreManager.isIgnored({
        fs,
        gitdir: updatedGitdir,
        dir,
        filepath
      });
      if (ignored) {
        return "ignored";
      }
      const headTree = await getHeadTree({ fs, cache, gitdir: updatedGitdir });
      const treeOid = await getOidAtPath({
        fs,
        cache,
        gitdir: updatedGitdir,
        tree: headTree,
        path: filepath
      });
      const indexEntry = await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
        for (const entry of index2) {
          if (entry.path === filepath)
            return entry;
        }
        return null;
      });
      const stats = await fs.lstat(join(dir, filepath));
      const H = treeOid !== null;
      const I = indexEntry !== null;
      const W = stats !== null;
      const getWorkdirOid = async () => {
        if (I && !compareStats(indexEntry, stats)) {
          return indexEntry.oid;
        } else {
          const object = await fs.read(join(dir, filepath));
          const workdirOid = await hashObject$1({
            gitdir: updatedGitdir,
            type: "blob",
            object
          });
          if (I && indexEntry.oid === workdirOid) {
            if (stats.size !== -1) {
              GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
                index2.insert({ filepath, stats, oid: workdirOid });
              });
            }
          }
          return workdirOid;
        }
      };
      if (!H && !W && !I)
        return "absent";
      if (!H && !W && I)
        return "*absent";
      if (!H && W && !I)
        return "*added";
      if (!H && W && I) {
        const workdirOid = await getWorkdirOid();
        return workdirOid === indexEntry.oid ? "added" : "*added";
      }
      if (H && !W && !I)
        return "deleted";
      if (H && !W && I) {
        return treeOid === indexEntry.oid ? "*deleted" : "*deleted";
      }
      if (H && W && !I) {
        const workdirOid = await getWorkdirOid();
        return workdirOid === treeOid ? "*undeleted" : "*undeletemodified";
      }
      if (H && W && I) {
        const workdirOid = await getWorkdirOid();
        if (workdirOid === treeOid) {
          return workdirOid === indexEntry.oid ? "unmodified" : "*unmodified";
        } else {
          return workdirOid === indexEntry.oid ? "modified" : "*modified";
        }
      }
    } catch (err) {
      err.caller = "git.status";
      throw err;
    }
  }
  async function getOidAtPath({ fs, cache, gitdir: updatedGitdir, tree, path }) {
    if (typeof path === "string")
      path = path.split("/");
    const dirname2 = path.shift();
    for (const entry of tree) {
      if (entry.path === dirname2) {
        if (path.length === 0) {
          return entry.oid;
        }
        const { type, object } = await _readObject({
          fs,
          cache,
          gitdir: updatedGitdir,
          oid: entry.oid
        });
        if (type === "tree") {
          const tree2 = GitTree.from(object);
          return getOidAtPath({ fs, cache, gitdir: updatedGitdir, tree: tree2, path });
        }
        if (type === "blob") {
          throw new ObjectTypeError(entry.oid, type, "blob", path.join("/"));
        }
      }
    }
    return null;
  }
  async function getHeadTree({ fs, cache, gitdir: updatedGitdir }) {
    let oid;
    try {
      oid = await GitRefManager.resolve({
        fs,
        gitdir: updatedGitdir,
        ref: "HEAD"
      });
    } catch (e) {
      if (e instanceof NotFoundError) {
        return [];
      }
    }
    const { tree } = await _readTree({ fs, cache, gitdir: updatedGitdir, oid });
    return tree;
  }
  async function statusMatrix({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    ref = "HEAD",
    filepaths = ["."],
    filter,
    cache = {},
    ignored: shouldIgnore = false
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      return await _walk({
        fs,
        cache,
        dir,
        gitdir: updatedGitdir,
        trees: [TREE({ ref }), WORKDIR(), STAGE()],
        map: async function(filepath, [head, workdir, stage]) {
          if (!head && !stage && workdir) {
            if (!shouldIgnore) {
              const isIgnored2 = await GitIgnoreManager.isIgnored({
                fs,
                dir,
                filepath
              });
              if (isIgnored2) {
                return null;
              }
            }
          }
          if (!filepaths.some((base) => worthWalking(filepath, base))) {
            return null;
          }
          if (filter) {
            if (!filter(filepath))
              return;
          }
          const [headType, workdirType, stageType] = await Promise.all([
            head && head.type(),
            workdir && workdir.type(),
            stage && stage.type()
          ]);
          const isBlob = [headType, workdirType, stageType].includes("blob");
          if ((headType === "tree" || headType === "special") && !isBlob)
            return;
          if (headType === "commit")
            return null;
          if ((workdirType === "tree" || workdirType === "special") && !isBlob)
            return;
          if (stageType === "commit")
            return null;
          if ((stageType === "tree" || stageType === "special") && !isBlob)
            return;
          const headOid = headType === "blob" ? await head.oid() : undefined;
          const stageOid = stageType === "blob" ? await stage.oid() : undefined;
          let workdirOid;
          if (headType !== "blob" && workdirType === "blob" && stageType !== "blob") {
            workdirOid = "42";
          } else if (workdirType === "blob") {
            workdirOid = await workdir.oid();
          }
          const entry = [undefined, headOid, workdirOid, stageOid];
          const result = entry.map((value) => entry.indexOf(value));
          result.shift();
          return [filepath, ...result];
        }
      });
    } catch (err) {
      err.caller = "git.statusMatrix";
      throw err;
    }
  }
  async function tag({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    object,
    force = false
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      const fs = new FileSystem(_fs);
      if (ref === undefined) {
        throw new MissingParameterError("ref");
      }
      ref = ref.startsWith("refs/tags/") ? ref : `refs/tags/${ref}`;
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      const value = await GitRefManager.resolve({
        fs,
        gitdir: updatedGitdir,
        ref: object || "HEAD"
      });
      if (!force && await GitRefManager.exists({ fs, gitdir: updatedGitdir, ref })) {
        throw new AlreadyExistsError("tag", ref);
      }
      await GitRefManager.writeRef({ fs, gitdir: updatedGitdir, ref, value });
    } catch (err) {
      err.caller = "git.tag";
      throw err;
    }
  }
  async function updateIndex$1({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    cache = {},
    filepath,
    oid,
    mode,
    add: add2,
    remove: remove2,
    force
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("filepath", filepath);
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      if (remove2) {
        return await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
          if (!force) {
            const fileStats2 = await fs.lstat(join(dir, filepath));
            if (fileStats2) {
              if (fileStats2.isDirectory()) {
                throw new InvalidFilepathError("directory");
              }
              return;
            }
          }
          if (index2.has({ filepath })) {
            index2.delete({
              filepath
            });
          }
        });
      }
      let fileStats;
      if (!oid) {
        fileStats = await fs.lstat(join(dir, filepath));
        if (!fileStats) {
          throw new NotFoundError(`file at "${filepath}" on disk and "remove" not set`);
        }
        if (fileStats.isDirectory()) {
          throw new InvalidFilepathError("directory");
        }
      }
      return await GitIndexManager.acquire({ fs, gitdir: updatedGitdir, cache }, async function(index2) {
        if (!add2 && !index2.has({ filepath })) {
          throw new NotFoundError(`file at "${filepath}" in index and "add" not set`);
        }
        let stats;
        if (!oid) {
          stats = fileStats;
          const object = stats.isSymbolicLink() ? await fs.readlink(join(dir, filepath)) : await fs.read(join(dir, filepath));
          oid = await _writeObject({
            fs,
            gitdir: updatedGitdir,
            type: "blob",
            format: "content",
            object
          });
        } else {
          stats = {
            ctime: new Date(0),
            mtime: new Date(0),
            dev: 0,
            ino: 0,
            mode,
            uid: 0,
            gid: 0,
            size: 0
          };
        }
        index2.insert({
          filepath,
          oid,
          stats
        });
        return oid;
      });
    } catch (err) {
      err.caller = "git.updateIndex";
      throw err;
    }
  }
  function version() {
    try {
      return pkg.version;
    } catch (err) {
      err.caller = "git.version";
      throw err;
    }
  }
  async function walk({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    trees,
    map,
    reduce,
    iterate,
    cache = {}
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("trees", trees);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _walk({
        fs: fsp,
        cache,
        dir,
        gitdir: updatedGitdir,
        trees,
        map,
        reduce,
        iterate
      });
    } catch (err) {
      err.caller = "git.walk";
      throw err;
    }
  }
  async function writeBlob({ fs, dir, gitdir = join(dir, ".git"), blob }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("blob", blob);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _writeObject({
        fs: fsp,
        gitdir: updatedGitdir,
        type: "blob",
        object: blob,
        format: "content"
      });
    } catch (err) {
      err.caller = "git.writeBlob";
      throw err;
    }
  }
  async function writeCommit({
    fs,
    dir,
    gitdir = join(dir, ".git"),
    commit: commit2
  }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("commit", commit2);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _writeCommit({
        fs: fsp,
        gitdir: updatedGitdir,
        commit: commit2
      });
    } catch (err) {
      err.caller = "git.writeCommit";
      throw err;
    }
  }
  async function writeObject({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    type,
    object,
    format = "parsed",
    oid,
    encoding = undefined
  }) {
    try {
      const fs = new FileSystem(_fs);
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      if (format === "parsed") {
        switch (type) {
          case "commit":
            object = GitCommit.from(object).toObject();
            break;
          case "tree":
            object = GitTree.from(object).toObject();
            break;
          case "blob":
            object = Buffer.from(object, encoding);
            break;
          case "tag":
            object = GitAnnotatedTag.from(object).toObject();
            break;
          default:
            throw new ObjectTypeError(oid || "", type, "blob|commit|tag|tree");
        }
        format = "content";
      }
      oid = await _writeObject({
        fs,
        gitdir: updatedGitdir,
        type,
        object,
        oid,
        format
      });
      return oid;
    } catch (err) {
      err.caller = "git.writeObject";
      throw err;
    }
  }
  async function writeRef({
    fs: _fs,
    dir,
    gitdir = join(dir, ".git"),
    ref,
    value,
    force = false,
    symbolic = false
  }) {
    try {
      assertParameter("fs", _fs);
      assertParameter("gitdir", gitdir);
      assertParameter("ref", ref);
      assertParameter("value", value);
      const fs = new FileSystem(_fs);
      if (!isValidRef(ref, true)) {
        throw new InvalidRefNameError(ref, cleanGitRef.clean(ref));
      }
      const updatedGitdir = await discoverGitdir({ fsp: fs, dotgit: gitdir });
      if (!force && await GitRefManager.exists({ fs, gitdir: updatedGitdir, ref })) {
        throw new AlreadyExistsError("ref", ref);
      }
      if (symbolic) {
        await GitRefManager.writeSymbolicRef({
          fs,
          gitdir: updatedGitdir,
          ref,
          value
        });
      } else {
        value = await GitRefManager.resolve({
          fs,
          gitdir: updatedGitdir,
          ref: value
        });
        await GitRefManager.writeRef({
          fs,
          gitdir: updatedGitdir,
          ref,
          value
        });
      }
    } catch (err) {
      err.caller = "git.writeRef";
      throw err;
    }
  }
  async function _writeTag({ fs, gitdir, tag: tag2 }) {
    const object = GitAnnotatedTag.from(tag2).toObject();
    const oid = await _writeObject({
      fs,
      gitdir,
      type: "tag",
      object,
      format: "content"
    });
    return oid;
  }
  async function writeTag({ fs, dir, gitdir = join(dir, ".git"), tag: tag2 }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("tag", tag2);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _writeTag({
        fs: fsp,
        gitdir: updatedGitdir,
        tag: tag2
      });
    } catch (err) {
      err.caller = "git.writeTag";
      throw err;
    }
  }
  async function writeTree({ fs, dir, gitdir = join(dir, ".git"), tree }) {
    try {
      assertParameter("fs", fs);
      assertParameter("gitdir", gitdir);
      assertParameter("tree", tree);
      const fsp = new FileSystem(fs);
      const updatedGitdir = await discoverGitdir({ fsp, dotgit: gitdir });
      return await _writeTree({
        fs: fsp,
        gitdir: updatedGitdir,
        tree
      });
    } catch (err) {
      err.caller = "git.writeTree";
      throw err;
    }
  }
  var index = {
    Errors,
    STAGE,
    TREE,
    WORKDIR,
    add,
    abortMerge,
    addNote,
    addRemote,
    annotatedTag,
    branch,
    checkout,
    clone,
    commit,
    getConfig,
    getConfigAll,
    setConfig,
    currentBranch,
    deleteBranch,
    deleteRef,
    deleteRemote,
    deleteTag,
    expandOid,
    expandRef,
    fastForward,
    fetch,
    findMergeBase,
    findRoot,
    getRemoteInfo,
    getRemoteInfo2,
    hashBlob,
    indexPack,
    init,
    isDescendent,
    isIgnored,
    listBranches,
    listFiles,
    listNotes,
    listRefs,
    listRemotes,
    listServerRefs,
    listTags,
    log,
    merge,
    packObjects,
    pull,
    push,
    readBlob,
    readCommit,
    readNote,
    readObject,
    readTag,
    readTree,
    remove,
    removeNote,
    renameBranch,
    resetIndex,
    updateIndex: updateIndex$1,
    resolveRef,
    status,
    statusMatrix,
    tag,
    version,
    walk,
    writeBlob,
    writeCommit,
    writeObject,
    writeRef,
    writeTag,
    writeTree,
    stash
  };
  exports.Errors = Errors;
  exports.STAGE = STAGE;
  exports.TREE = TREE;
  exports.WORKDIR = WORKDIR;
  exports.abortMerge = abortMerge;
  exports.add = add;
  exports.addNote = addNote;
  exports.addRemote = addRemote;
  exports.annotatedTag = annotatedTag;
  exports.branch = branch;
  exports.checkout = checkout;
  exports.clone = clone;
  exports.commit = commit;
  exports.currentBranch = currentBranch;
  exports.default = index;
  exports.deleteBranch = deleteBranch;
  exports.deleteRef = deleteRef;
  exports.deleteRemote = deleteRemote;
  exports.deleteTag = deleteTag;
  exports.expandOid = expandOid;
  exports.expandRef = expandRef;
  exports.fastForward = fastForward;
  exports.fetch = fetch;
  exports.findMergeBase = findMergeBase;
  exports.findRoot = findRoot;
  exports.getConfig = getConfig;
  exports.getConfigAll = getConfigAll;
  exports.getRemoteInfo = getRemoteInfo;
  exports.getRemoteInfo2 = getRemoteInfo2;
  exports.hashBlob = hashBlob;
  exports.indexPack = indexPack;
  exports.init = init;
  exports.isDescendent = isDescendent;
  exports.isIgnored = isIgnored;
  exports.listBranches = listBranches;
  exports.listFiles = listFiles;
  exports.listNotes = listNotes;
  exports.listRefs = listRefs;
  exports.listRemotes = listRemotes;
  exports.listServerRefs = listServerRefs;
  exports.listTags = listTags;
  exports.log = log;
  exports.merge = merge;
  exports.packObjects = packObjects;
  exports.pull = pull;
  exports.push = push;
  exports.readBlob = readBlob;
  exports.readCommit = readCommit;
  exports.readNote = readNote;
  exports.readObject = readObject;
  exports.readTag = readTag;
  exports.readTree = readTree;
  exports.remove = remove;
  exports.removeNote = removeNote;
  exports.renameBranch = renameBranch;
  exports.resetIndex = resetIndex;
  exports.resolveRef = resolveRef;
  exports.setConfig = setConfig;
  exports.stash = stash;
  exports.status = status;
  exports.statusMatrix = statusMatrix;
  exports.tag = tag;
  exports.updateIndex = updateIndex$1;
  exports.version = version;
  exports.walk = walk;
  exports.writeBlob = writeBlob;
  exports.writeCommit = writeCommit;
  exports.writeObject = writeObject;
  exports.writeRef = writeRef;
  exports.writeTag = writeTag;
  exports.writeTree = writeTree;
});

// src/cli.ts
var import_isomorphic_git = __toESM(require_isomorphic_git(), 1);
import nodeFs from "node:fs";
import { join } from "node:path";

// node_modules/zod/v4/classic/external.js
var exports_external = {};
__export(exports_external, {
  xid: () => xid2,
  void: () => _void2,
  uuidv7: () => uuidv7,
  uuidv6: () => uuidv6,
  uuidv4: () => uuidv4,
  uuid: () => uuid2,
  util: () => exports_util,
  url: () => url,
  uppercase: () => _uppercase,
  unknown: () => unknown,
  union: () => union,
  undefined: () => _undefined3,
  ulid: () => ulid2,
  uint64: () => uint64,
  uint32: () => uint32,
  tuple: () => tuple,
  trim: () => _trim,
  treeifyError: () => treeifyError,
  transform: () => transform,
  toUpperCase: () => _toUpperCase,
  toLowerCase: () => _toLowerCase,
  toJSONSchema: () => toJSONSchema,
  templateLiteral: () => templateLiteral,
  symbol: () => symbol,
  superRefine: () => superRefine,
  success: () => success,
  stringbool: () => stringbool,
  stringFormat: () => stringFormat,
  string: () => string2,
  strictObject: () => strictObject,
  startsWith: () => _startsWith,
  slugify: () => _slugify,
  size: () => _size,
  setErrorMap: () => setErrorMap,
  set: () => set,
  safeParseAsync: () => safeParseAsync2,
  safeParse: () => safeParse2,
  safeEncodeAsync: () => safeEncodeAsync2,
  safeEncode: () => safeEncode2,
  safeDecodeAsync: () => safeDecodeAsync2,
  safeDecode: () => safeDecode2,
  registry: () => registry,
  regexes: () => exports_regexes,
  regex: () => _regex,
  refine: () => refine,
  record: () => record,
  readonly: () => readonly,
  property: () => _property,
  promise: () => promise,
  prettifyError: () => prettifyError,
  preprocess: () => preprocess,
  prefault: () => prefault,
  positive: () => _positive,
  pipe: () => pipe,
  partialRecord: () => partialRecord,
  parseAsync: () => parseAsync2,
  parse: () => parse3,
  overwrite: () => _overwrite,
  optional: () => optional,
  object: () => object,
  number: () => number2,
  nullish: () => nullish2,
  nullable: () => nullable,
  null: () => _null3,
  normalize: () => _normalize,
  nonpositive: () => _nonpositive,
  nonoptional: () => nonoptional,
  nonnegative: () => _nonnegative,
  never: () => never,
  negative: () => _negative,
  nativeEnum: () => nativeEnum,
  nanoid: () => nanoid2,
  nan: () => nan,
  multipleOf: () => _multipleOf,
  minSize: () => _minSize,
  minLength: () => _minLength,
  mime: () => _mime,
  meta: () => meta2,
  maxSize: () => _maxSize,
  maxLength: () => _maxLength,
  map: () => map,
  mac: () => mac2,
  lte: () => _lte,
  lt: () => _lt,
  lowercase: () => _lowercase,
  looseObject: () => looseObject,
  locales: () => exports_locales,
  literal: () => literal,
  length: () => _length,
  lazy: () => lazy,
  ksuid: () => ksuid2,
  keyof: () => keyof,
  jwt: () => jwt,
  json: () => json,
  iso: () => exports_iso,
  ipv6: () => ipv62,
  ipv4: () => ipv42,
  intersection: () => intersection,
  int64: () => int64,
  int32: () => int32,
  int: () => int,
  instanceof: () => _instanceof,
  includes: () => _includes,
  httpUrl: () => httpUrl,
  hostname: () => hostname2,
  hex: () => hex2,
  hash: () => hash,
  guid: () => guid2,
  gte: () => _gte,
  gt: () => _gt,
  globalRegistry: () => globalRegistry,
  getErrorMap: () => getErrorMap,
  function: () => _function,
  formatError: () => formatError,
  float64: () => float64,
  float32: () => float32,
  flattenError: () => flattenError,
  file: () => file,
  enum: () => _enum2,
  endsWith: () => _endsWith,
  encodeAsync: () => encodeAsync2,
  encode: () => encode2,
  emoji: () => emoji2,
  email: () => email2,
  e164: () => e1642,
  discriminatedUnion: () => discriminatedUnion,
  describe: () => describe2,
  decodeAsync: () => decodeAsync2,
  decode: () => decode2,
  date: () => date3,
  custom: () => custom,
  cuid2: () => cuid22,
  cuid: () => cuid3,
  core: () => exports_core2,
  config: () => config,
  coerce: () => exports_coerce,
  codec: () => codec,
  clone: () => clone,
  cidrv6: () => cidrv62,
  cidrv4: () => cidrv42,
  check: () => check,
  catch: () => _catch2,
  boolean: () => boolean2,
  bigint: () => bigint2,
  base64url: () => base64url2,
  base64: () => base642,
  array: () => array,
  any: () => any,
  _function: () => _function,
  _default: () => _default2,
  _ZodString: () => _ZodString,
  ZodXID: () => ZodXID,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodUUID: () => ZodUUID,
  ZodURL: () => ZodURL,
  ZodULID: () => ZodULID,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransform: () => ZodTransform,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodSymbol: () => ZodSymbol,
  ZodSuccess: () => ZodSuccess,
  ZodStringFormat: () => ZodStringFormat,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodRecord: () => ZodRecord,
  ZodRealError: () => ZodRealError,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPrefault: () => ZodPrefault,
  ZodPipe: () => ZodPipe,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNonOptional: () => ZodNonOptional,
  ZodNever: () => ZodNever,
  ZodNanoID: () => ZodNanoID,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodMAC: () => ZodMAC,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodKSUID: () => ZodKSUID,
  ZodJWT: () => ZodJWT,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate,
  ZodIPv6: () => ZodIPv6,
  ZodIPv4: () => ZodIPv4,
  ZodGUID: () => ZodGUID,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFile: () => ZodFile,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEmoji: () => ZodEmoji,
  ZodEmail: () => ZodEmail,
  ZodE164: () => ZodE164,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodCustom: () => ZodCustom,
  ZodCodec: () => ZodCodec,
  ZodCatch: () => ZodCatch,
  ZodCUID2: () => ZodCUID2,
  ZodCUID: () => ZodCUID,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodBoolean: () => ZodBoolean,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBigInt: () => ZodBigInt,
  ZodBase64URL: () => ZodBase64URL,
  ZodBase64: () => ZodBase64,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  $output: () => $output,
  $input: () => $input,
  $brand: () => $brand
});

// node_modules/zod/v4/core/index.js
var exports_core2 = {};
__export(exports_core2, {
  version: () => version,
  util: () => exports_util,
  treeifyError: () => treeifyError,
  toJSONSchema: () => toJSONSchema,
  toDotPath: () => toDotPath,
  safeParseAsync: () => safeParseAsync,
  safeParse: () => safeParse,
  safeEncodeAsync: () => safeEncodeAsync,
  safeEncode: () => safeEncode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeDecode: () => safeDecode,
  registry: () => registry,
  regexes: () => exports_regexes,
  prettifyError: () => prettifyError,
  parseAsync: () => parseAsync,
  parse: () => parse,
  meta: () => meta,
  locales: () => exports_locales,
  isValidJWT: () => isValidJWT,
  isValidBase64URL: () => isValidBase64URL,
  isValidBase64: () => isValidBase64,
  globalRegistry: () => globalRegistry,
  globalConfig: () => globalConfig,
  formatError: () => formatError,
  flattenError: () => flattenError,
  encodeAsync: () => encodeAsync,
  encode: () => encode,
  describe: () => describe,
  decodeAsync: () => decodeAsync,
  decode: () => decode,
  config: () => config,
  clone: () => clone,
  _xid: () => _xid,
  _void: () => _void,
  _uuidv7: () => _uuidv7,
  _uuidv6: () => _uuidv6,
  _uuidv4: () => _uuidv4,
  _uuid: () => _uuid,
  _url: () => _url,
  _uppercase: () => _uppercase,
  _unknown: () => _unknown,
  _union: () => _union,
  _undefined: () => _undefined2,
  _ulid: () => _ulid,
  _uint64: () => _uint64,
  _uint32: () => _uint32,
  _tuple: () => _tuple,
  _trim: () => _trim,
  _transform: () => _transform,
  _toUpperCase: () => _toUpperCase,
  _toLowerCase: () => _toLowerCase,
  _templateLiteral: () => _templateLiteral,
  _symbol: () => _symbol,
  _superRefine: () => _superRefine,
  _success: () => _success,
  _stringbool: () => _stringbool,
  _stringFormat: () => _stringFormat,
  _string: () => _string,
  _startsWith: () => _startsWith,
  _slugify: () => _slugify,
  _size: () => _size,
  _set: () => _set,
  _safeParseAsync: () => _safeParseAsync,
  _safeParse: () => _safeParse,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeEncode: () => _safeEncode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeDecode: () => _safeDecode,
  _regex: () => _regex,
  _refine: () => _refine,
  _record: () => _record,
  _readonly: () => _readonly,
  _property: () => _property,
  _promise: () => _promise,
  _positive: () => _positive,
  _pipe: () => _pipe,
  _parseAsync: () => _parseAsync,
  _parse: () => _parse,
  _overwrite: () => _overwrite,
  _optional: () => _optional,
  _number: () => _number,
  _nullable: () => _nullable,
  _null: () => _null2,
  _normalize: () => _normalize,
  _nonpositive: () => _nonpositive,
  _nonoptional: () => _nonoptional,
  _nonnegative: () => _nonnegative,
  _never: () => _never,
  _negative: () => _negative,
  _nativeEnum: () => _nativeEnum,
  _nanoid: () => _nanoid,
  _nan: () => _nan,
  _multipleOf: () => _multipleOf,
  _minSize: () => _minSize,
  _minLength: () => _minLength,
  _min: () => _gte,
  _mime: () => _mime,
  _maxSize: () => _maxSize,
  _maxLength: () => _maxLength,
  _max: () => _lte,
  _map: () => _map,
  _mac: () => _mac,
  _lte: () => _lte,
  _lt: () => _lt,
  _lowercase: () => _lowercase,
  _literal: () => _literal,
  _length: () => _length,
  _lazy: () => _lazy,
  _ksuid: () => _ksuid,
  _jwt: () => _jwt,
  _isoTime: () => _isoTime,
  _isoDuration: () => _isoDuration,
  _isoDateTime: () => _isoDateTime,
  _isoDate: () => _isoDate,
  _ipv6: () => _ipv6,
  _ipv4: () => _ipv4,
  _intersection: () => _intersection,
  _int64: () => _int64,
  _int32: () => _int32,
  _int: () => _int,
  _includes: () => _includes,
  _guid: () => _guid,
  _gte: () => _gte,
  _gt: () => _gt,
  _float64: () => _float64,
  _float32: () => _float32,
  _file: () => _file,
  _enum: () => _enum,
  _endsWith: () => _endsWith,
  _encodeAsync: () => _encodeAsync,
  _encode: () => _encode,
  _emoji: () => _emoji2,
  _email: () => _email,
  _e164: () => _e164,
  _discriminatedUnion: () => _discriminatedUnion,
  _default: () => _default,
  _decodeAsync: () => _decodeAsync,
  _decode: () => _decode,
  _date: () => _date,
  _custom: () => _custom,
  _cuid2: () => _cuid2,
  _cuid: () => _cuid,
  _coercedString: () => _coercedString,
  _coercedNumber: () => _coercedNumber,
  _coercedDate: () => _coercedDate,
  _coercedBoolean: () => _coercedBoolean,
  _coercedBigint: () => _coercedBigint,
  _cidrv6: () => _cidrv6,
  _cidrv4: () => _cidrv4,
  _check: () => _check,
  _catch: () => _catch,
  _boolean: () => _boolean,
  _bigint: () => _bigint,
  _base64url: () => _base64url,
  _base64: () => _base64,
  _array: () => _array,
  _any: () => _any,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  JSONSchema: () => exports_json_schema,
  Doc: () => Doc,
  $output: () => $output,
  $input: () => $input,
  $constructor: () => $constructor,
  $brand: () => $brand,
  $ZodXID: () => $ZodXID,
  $ZodVoid: () => $ZodVoid,
  $ZodUnknown: () => $ZodUnknown,
  $ZodUnion: () => $ZodUnion,
  $ZodUndefined: () => $ZodUndefined,
  $ZodUUID: () => $ZodUUID,
  $ZodURL: () => $ZodURL,
  $ZodULID: () => $ZodULID,
  $ZodType: () => $ZodType,
  $ZodTuple: () => $ZodTuple,
  $ZodTransform: () => $ZodTransform,
  $ZodTemplateLiteral: () => $ZodTemplateLiteral,
  $ZodSymbol: () => $ZodSymbol,
  $ZodSuccess: () => $ZodSuccess,
  $ZodStringFormat: () => $ZodStringFormat,
  $ZodString: () => $ZodString,
  $ZodSet: () => $ZodSet,
  $ZodRegistry: () => $ZodRegistry,
  $ZodRecord: () => $ZodRecord,
  $ZodRealError: () => $ZodRealError,
  $ZodReadonly: () => $ZodReadonly,
  $ZodPromise: () => $ZodPromise,
  $ZodPrefault: () => $ZodPrefault,
  $ZodPipe: () => $ZodPipe,
  $ZodOptional: () => $ZodOptional,
  $ZodObjectJIT: () => $ZodObjectJIT,
  $ZodObject: () => $ZodObject,
  $ZodNumberFormat: () => $ZodNumberFormat,
  $ZodNumber: () => $ZodNumber,
  $ZodNullable: () => $ZodNullable,
  $ZodNull: () => $ZodNull,
  $ZodNonOptional: () => $ZodNonOptional,
  $ZodNever: () => $ZodNever,
  $ZodNanoID: () => $ZodNanoID,
  $ZodNaN: () => $ZodNaN,
  $ZodMap: () => $ZodMap,
  $ZodMAC: () => $ZodMAC,
  $ZodLiteral: () => $ZodLiteral,
  $ZodLazy: () => $ZodLazy,
  $ZodKSUID: () => $ZodKSUID,
  $ZodJWT: () => $ZodJWT,
  $ZodIntersection: () => $ZodIntersection,
  $ZodISOTime: () => $ZodISOTime,
  $ZodISODuration: () => $ZodISODuration,
  $ZodISODateTime: () => $ZodISODateTime,
  $ZodISODate: () => $ZodISODate,
  $ZodIPv6: () => $ZodIPv6,
  $ZodIPv4: () => $ZodIPv4,
  $ZodGUID: () => $ZodGUID,
  $ZodFunction: () => $ZodFunction,
  $ZodFile: () => $ZodFile,
  $ZodError: () => $ZodError,
  $ZodEnum: () => $ZodEnum,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEmoji: () => $ZodEmoji,
  $ZodEmail: () => $ZodEmail,
  $ZodE164: () => $ZodE164,
  $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
  $ZodDefault: () => $ZodDefault,
  $ZodDate: () => $ZodDate,
  $ZodCustomStringFormat: () => $ZodCustomStringFormat,
  $ZodCustom: () => $ZodCustom,
  $ZodCodec: () => $ZodCodec,
  $ZodCheckUpperCase: () => $ZodCheckUpperCase,
  $ZodCheckStringFormat: () => $ZodCheckStringFormat,
  $ZodCheckStartsWith: () => $ZodCheckStartsWith,
  $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
  $ZodCheckRegex: () => $ZodCheckRegex,
  $ZodCheckProperty: () => $ZodCheckProperty,
  $ZodCheckOverwrite: () => $ZodCheckOverwrite,
  $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
  $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
  $ZodCheckMinSize: () => $ZodCheckMinSize,
  $ZodCheckMinLength: () => $ZodCheckMinLength,
  $ZodCheckMimeType: () => $ZodCheckMimeType,
  $ZodCheckMaxSize: () => $ZodCheckMaxSize,
  $ZodCheckMaxLength: () => $ZodCheckMaxLength,
  $ZodCheckLowerCase: () => $ZodCheckLowerCase,
  $ZodCheckLessThan: () => $ZodCheckLessThan,
  $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
  $ZodCheckIncludes: () => $ZodCheckIncludes,
  $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
  $ZodCheckEndsWith: () => $ZodCheckEndsWith,
  $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
  $ZodCheck: () => $ZodCheck,
  $ZodCatch: () => $ZodCatch,
  $ZodCUID2: () => $ZodCUID2,
  $ZodCUID: () => $ZodCUID,
  $ZodCIDRv6: () => $ZodCIDRv6,
  $ZodCIDRv4: () => $ZodCIDRv4,
  $ZodBoolean: () => $ZodBoolean,
  $ZodBigIntFormat: () => $ZodBigIntFormat,
  $ZodBigInt: () => $ZodBigInt,
  $ZodBase64URL: () => $ZodBase64URL,
  $ZodBase64: () => $ZodBase64,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodArray: () => $ZodArray,
  $ZodAny: () => $ZodAny
});

// node_modules/zod/v4/core/core.js
var NEVER = Object.freeze({
  status: "aborted"
});
function $constructor(name, initializer, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: new Set
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $brand = Symbol("zod_brand");

class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}

class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
// node_modules/zod/v4/core/util.js
var exports_util = {};
__export(exports_util, {
  unwrapMessage: () => unwrapMessage,
  uint8ArrayToHex: () => uint8ArrayToHex,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  stringifyPrimitive: () => stringifyPrimitive,
  slugify: () => slugify,
  shallowClone: () => shallowClone,
  safeExtend: () => safeExtend,
  required: () => required,
  randomString: () => randomString,
  propertyKeyTypes: () => propertyKeyTypes,
  promiseAllObject: () => promiseAllObject,
  primitiveTypes: () => primitiveTypes,
  prefixIssues: () => prefixIssues,
  pick: () => pick,
  partial: () => partial,
  optionalKeys: () => optionalKeys,
  omit: () => omit,
  objectClone: () => objectClone,
  numKeys: () => numKeys,
  nullish: () => nullish,
  normalizeParams: () => normalizeParams,
  mergeDefs: () => mergeDefs,
  merge: () => merge,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  joinValues: () => joinValues,
  issue: () => issue,
  isPlainObject: () => isPlainObject,
  isObject: () => isObject,
  hexToUint8Array: () => hexToUint8Array,
  getSizableOrigin: () => getSizableOrigin,
  getParsedType: () => getParsedType,
  getLengthableOrigin: () => getLengthableOrigin,
  getEnumValues: () => getEnumValues,
  getElementAtPath: () => getElementAtPath,
  floatSafeRemainder: () => floatSafeRemainder,
  finalizeIssue: () => finalizeIssue,
  extend: () => extend,
  escapeRegex: () => escapeRegex,
  esc: () => esc,
  defineLazy: () => defineLazy,
  createTransparentProxy: () => createTransparentProxy,
  cloneDef: () => cloneDef,
  clone: () => clone,
  cleanRegex: () => cleanRegex,
  cleanEnum: () => cleanEnum,
  captureStackTrace: () => captureStackTrace,
  cached: () => cached,
  base64urlToUint8Array: () => base64urlToUint8Array,
  base64ToUint8Array: () => base64ToUint8Array,
  assignProp: () => assignProp,
  assertNotEqual: () => assertNotEqual,
  assertNever: () => assertNever,
  assertIs: () => assertIs,
  assertEqual: () => assertEqual,
  assert: () => assert,
  allowsEval: () => allowsEval,
  aborted: () => aborted,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  Class: () => Class,
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {}
function assertNever(_x) {
  throw new Error;
}
function assert(_) {}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match?.[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0;i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0;i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
};
var propertyKeyTypes = new Set(["string", "number", "symbol"]);
var primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = {
    ...schema._zod.def,
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: schema._zod.def.checks
  };
  return clone(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0;i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0;i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0;i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Class {
  constructor(..._args) {}
}

// node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error2) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
function treeifyError(error, mapper = (issue2) => issue2.message) {
  const result = { errors: [] };
  const processError = (error2, path = []) => {
    var _a, _b;
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, issue2.path));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, issue2.path);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, issue2.path);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          result.errors.push(mapper(issue2));
          continue;
        }
        let curr = result;
        let i = 0;
        while (i < fullpath.length) {
          const el = fullpath[i];
          const terminal = i === fullpath.length - 1;
          if (typeof el === "string") {
            curr.properties ?? (curr.properties = {});
            (_a = curr.properties)[el] ?? (_a[el] = { errors: [] });
            curr = curr.properties[el];
          } else {
            curr.items ?? (curr.items = []);
            (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
            curr = curr.items[el];
          }
          if (terminal) {
            curr.errors.push(mapper(issue2));
          }
          i++;
        }
      }
    }
  };
  processError(error);
  return result;
}
function toDotPath(_path) {
  const segs = [];
  const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
  for (const seg of path) {
    if (typeof seg === "number")
      segs.push(`[${seg}]`);
    else if (typeof seg === "symbol")
      segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg))
      segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length)
        segs.push(".");
      segs.push(seg);
    }
  }
  return segs.join("");
}
function prettifyError(error) {
  const lines = [];
  const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
  for (const issue2 of issues) {
    lines.push(`✖ ${issue2.message}`);
    if (issue2.path?.length)
      lines.push(`  → at ${toDotPath(issue2.path)}`);
  }
  return lines.join(`
`);
}

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var encode = /* @__PURE__ */ _encode($ZodRealError);
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var decode = /* @__PURE__ */ _decode($ZodRealError);
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);
// node_modules/zod/v4/core/regexes.js
var exports_regexes = {};
__export(exports_regexes, {
  xid: () => xid,
  uuid7: () => uuid7,
  uuid6: () => uuid6,
  uuid4: () => uuid4,
  uuid: () => uuid,
  uppercase: () => uppercase,
  unicodeEmail: () => unicodeEmail,
  undefined: () => _undefined,
  ulid: () => ulid,
  time: () => time,
  string: () => string,
  sha512_hex: () => sha512_hex,
  sha512_base64url: () => sha512_base64url,
  sha512_base64: () => sha512_base64,
  sha384_hex: () => sha384_hex,
  sha384_base64url: () => sha384_base64url,
  sha384_base64: () => sha384_base64,
  sha256_hex: () => sha256_hex,
  sha256_base64url: () => sha256_base64url,
  sha256_base64: () => sha256_base64,
  sha1_hex: () => sha1_hex,
  sha1_base64url: () => sha1_base64url,
  sha1_base64: () => sha1_base64,
  rfc5322Email: () => rfc5322Email,
  number: () => number,
  null: () => _null,
  nanoid: () => nanoid,
  md5_hex: () => md5_hex,
  md5_base64url: () => md5_base64url,
  md5_base64: () => md5_base64,
  mac: () => mac,
  lowercase: () => lowercase,
  ksuid: () => ksuid,
  ipv6: () => ipv6,
  ipv4: () => ipv4,
  integer: () => integer,
  idnEmail: () => idnEmail,
  html5Email: () => html5Email,
  hostname: () => hostname,
  hex: () => hex,
  guid: () => guid,
  extendedDuration: () => extendedDuration,
  emoji: () => emoji,
  email: () => email,
  e164: () => e164,
  duration: () => duration,
  domain: () => domain,
  datetime: () => datetime,
  date: () => date,
  cuid2: () => cuid2,
  cuid: () => cuid,
  cidrv6: () => cidrv6,
  cidrv4: () => cidrv4,
  browserEmail: () => browserEmail,
  boolean: () => boolean,
  bigint: () => bigint,
  base64url: () => base64url,
  base64: () => base64
});
var cuid = /^[cC][^\s-]{8,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var uuid4 = /* @__PURE__ */ uuid(4);
var uuid6 = /* @__PURE__ */ uuid(6);
var uuid7 = /* @__PURE__ */ uuid(7);
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
var idnEmail = unicodeEmail;
var browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var mac = (delimiter) => {
  const escapedDelim = escapeRegex(delimiter ?? ":");
  return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
};
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
var domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
var e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var bigint = /^-?\d+n?$/;
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?/;
var boolean = /^(?:true|false)$/i;
var _null = /^null$/i;
var _undefined = /^undefined$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
var hex = /^[0-9a-fA-F]*$/;
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var md5_hex = /^[0-9a-fA-F]{32}$/;
var md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
var md5_base64url = /* @__PURE__ */ fixedBase64url(22);
var sha1_hex = /^[0-9a-fA-F]{40}$/;
var sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
var sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
var sha256_hex = /^[0-9a-fA-F]{64}$/;
var sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
var sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
var sha384_hex = /^[0-9a-fA-F]{96}$/;
var sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
var sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
var sha512_hex = /^[0-9a-fA-F]{128}$/;
var sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
var sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

// node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a;
    (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inst
      });
    }
  };
});
var $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (input < minimum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_big",
        maximum,
        inst
      });
    }
  };
});
var $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size <= def.maximum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size >= def.minimum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.size;
    bag.maximum = def.size;
    bag.size = def.size;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size === def.size)
      return;
    const tooBig = size > def.size;
    payload.issues.push({
      origin: getSizableOrigin(input),
      ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a = inst._zod).check ?? (_a.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {});
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    const result = def.schema._zod.run({
      value: payload.value[def.property],
      issues: []
    }, {});
    if (result instanceof Promise) {
      return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
    }
    handleCheckPropertyResult(result, payload, def.property);
    return;
  };
});
var $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
  $ZodCheck.init(inst, def);
  const mimeSet = new Set(def.mime);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.mime = def.mime;
  });
  inst._zod.check = (payload) => {
    if (mimeSet.has(payload.value.type))
      return;
    payload.issues.push({
      code: "invalid_value",
      values: def.mime,
      input: payload.value.type,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 1,
  patch: 13
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError;
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  inst["~standard"] = {
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  };
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {}
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === undefined)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodMAC = /* @__PURE__ */ $constructor("$ZodMAC", (inst, def) => {
  def.pattern ?? (def.pattern = mac(def.delimiter));
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `mac`;
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error;
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error;
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error;
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error;
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (def.fn(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: def.format,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = bigint;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = BigInt(payload.value);
      } catch (_) {}
    if (typeof payload.value === "bigint")
      return payload;
    payload.issues.push({
      expected: "bigint",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigIntFormat", (inst, def) => {
  $ZodCheckBigIntFormat.init(inst, def);
  $ZodBigInt.init(inst, def);
});
var $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "symbol")
      return payload;
    payload.issues.push({
      expected: "symbol",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _undefined;
  inst._zod.values = new Set([undefined]);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "undefined",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
  inst._zod.values = new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "void",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce) {
      try {
        payload.value = new Date(payload.value);
      } catch (_err) {}
    }
    const input = payload.value;
    const isDate = input instanceof Date;
    const isValidDate = isDate && !Number.isNaN(input.getTime());
    if (isValidDate)
      return payload;
    payload.issues.push({
      expected: "date",
      code: "invalid_type",
      input,
      ...isDate ? { received: "Invalid Date" } : {},
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0;i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === undefined) {
    if (key in input) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  for (const key in input) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
    } else {
      handlePropertyResult(r, payload, key, input);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = new Set);
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
      } else {
        handlePropertyResult(r, payload, key, input);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      doc.write(`const ${id} = ${parseStr(key)};`);
      doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = new Set;
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    const opts = def.options;
    const map = new Map;
    for (const o of opts) {
      const values = o._zod.propValues?.[def.discriminator];
      if (!values || values.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values) {
        if (map.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map.set(v, o);
      }
    }
    return map;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt = disc.value.get(input?.[def.discriminator]);
    if (opt) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback) {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  if (left.issues.length) {
    result.issues.push(...left.issues);
  }
  if (right.issues.length) {
    result.issues.push(...right.issues);
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
  $ZodType.init(inst, def);
  const items = def.items;
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        input,
        inst,
        expected: "tuple",
        code: "invalid_type"
      });
      return payload;
    }
    payload.value = [];
    const proms = [];
    const reversedIndex = [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
    const optStart = reversedIndex === -1 ? 0 : items.length - reversedIndex;
    if (!def.rest) {
      const tooBig = input.length > items.length;
      const tooSmall = input.length < optStart - 1;
      if (tooBig || tooSmall) {
        payload.issues.push({
          ...tooBig ? { code: "too_big", maximum: items.length } : { code: "too_small", minimum: items.length },
          input,
          inst,
          origin: "array"
        });
        return payload;
      }
    }
    let i = -1;
    for (const item of items) {
      i++;
      if (i >= input.length) {
        if (i >= optStart)
          continue;
      }
      const result = item._zod.run({
        value: input[i],
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
      } else {
        handleTupleResult(result, payload, i);
      }
    }
    if (def.rest) {
      const rest = input.slice(items.length);
      for (const el of rest) {
        i++;
        const result = def.rest._zod.run({
          value: el,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
        } else {
          handleTupleResult(result, payload, i);
        }
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = new Set;
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[key] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[key] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        if (keyResult.issues.length) {
          payload.issues.push({
            code: "invalid_key",
            origin: "record",
            issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
            input: key,
            path: [key],
            inst
          });
          payload.value[keyResult.value] = keyResult.value;
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Map)) {
      payload.issues.push({
        expected: "map",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    payload.value = new Map;
    for (const [key, value] of input) {
      const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
      const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
      if (keyResult instanceof Promise || valueResult instanceof Promise) {
        proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
          handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
        }));
      } else {
        handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
var $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Set)) {
      payload.issues.push({
        input,
        inst,
        expected: "set",
        code: "invalid_type"
      });
      return payload;
    }
    const proms = [];
    payload.value = new Set;
    for (const item of input) {
      const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleSetResult(result2, payload)));
      } else
        handleSetResult(result, payload);
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input instanceof File)
      return payload;
    payload.issues.push({
      expected: "file",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError;
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === undefined) {
    return { issues: [], value: undefined };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === undefined) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError("ZodSuccess");
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.issues.length === 0;
        return payload;
      });
    }
    payload.value = result.issues.length === 0;
    return payload;
  };
});
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
var $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "nan",
        code: "invalid_type"
      });
      return payload;
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
var $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handleCodecAResult(left2, def, ctx));
      }
      return handleCodecAResult(left, def, ctx);
    } else {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handleCodecAResult(right2, def, ctx));
      }
      return handleCodecAResult(right, def, ctx);
    }
  };
});
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const regexParts = [];
  for (const part of def.parts) {
    if (typeof part === "object" && part !== null) {
      if (!part._zod.pattern) {
        throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
      }
      const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
      if (!source)
        throw new Error(`Invalid template literal part: ${part._zod.traits}`);
      const start = source.startsWith("^") ? 1 : 0;
      const end = source.endsWith("$") ? source.length - 1 : source.length;
      regexParts.push(source.slice(start, end));
    } else if (part === null || primitiveTypes.has(typeof part)) {
      regexParts.push(escapeRegex(`${part}`));
    } else {
      throw new Error(`Invalid template literal part: ${part}`);
    }
  }
  inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "string") {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "template_literal",
        code: "invalid_type"
      });
      return payload;
    }
    inst._zod.pattern.lastIndex = 0;
    if (!inst._zod.pattern.test(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        code: "invalid_format",
        format: def.format ?? "template_literal",
        pattern: inst._zod.pattern.source
      });
      return payload;
    }
    return payload;
  };
});
var $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
  $ZodType.init(inst, def);
  inst._def = def;
  inst._zod.def = def;
  inst.implement = (func) => {
    if (typeof func !== "function") {
      throw new Error("implement() must be called with a function");
    }
    return function(...args) {
      const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
      const result = Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return parse(inst._def.output, result);
      }
      return result;
    };
  };
  inst.implementAsync = (func) => {
    if (typeof func !== "function") {
      throw new Error("implementAsync() must be called with a function");
    }
    return async function(...args) {
      const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
      const result = await Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return await parseAsync(inst._def.output, result);
      }
      return result;
    };
  };
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "function") {
      payload.issues.push({
        code: "invalid_type",
        expected: "function",
        input: payload.value,
        inst
      });
      return payload;
    }
    const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
    if (hasPromiseOutput) {
      payload.value = inst.implementAsync(payload.value);
    } else {
      payload.value = inst.implement(payload.value);
    }
    return payload;
  };
  inst.input = (...args) => {
    const F = inst.constructor;
    if (Array.isArray(args[0])) {
      return new F({
        type: "function",
        input: new $ZodTuple({
          type: "tuple",
          items: args[0],
          rest: args[1]
        }),
        output: inst._def.output
      });
    }
    return new F({
      type: "function",
      input: args[0],
      output: inst._def.output
    });
  };
  inst.output = (output) => {
    const F = inst.constructor;
    return new F({
      type: "function",
      input: inst._def.input,
      output
    });
  };
  return inst;
});
var $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
  };
});
var $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "innerType", () => def.getter());
  defineLazy(inst._zod, "pattern", () => inst._zod.innerType?._zod?.pattern);
  defineLazy(inst._zod, "propValues", () => inst._zod.innerType?._zod?.propValues);
  defineLazy(inst._zod, "optin", () => inst._zod.innerType?._zod?.optin ?? undefined);
  defineLazy(inst._zod, "optout", () => inst._zod.innerType?._zod?.optout ?? undefined);
  inst._zod.parse = (payload, ctx) => {
    const inner = inst._zod.innerType;
    return inner._zod.run(payload, ctx);
  };
});
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
// node_modules/zod/v4/locales/index.js
var exports_locales = {};
__export(exports_locales, {
  zhTW: () => zh_TW_default,
  zhCN: () => zh_CN_default,
  yo: () => yo_default,
  vi: () => vi_default,
  ur: () => ur_default,
  uk: () => uk_default,
  ua: () => ua_default,
  tr: () => tr_default,
  th: () => th_default,
  ta: () => ta_default,
  sv: () => sv_default,
  sl: () => sl_default,
  ru: () => ru_default,
  pt: () => pt_default,
  ps: () => ps_default,
  pl: () => pl_default,
  ota: () => ota_default,
  no: () => no_default,
  nl: () => nl_default,
  ms: () => ms_default,
  mk: () => mk_default,
  lt: () => lt_default,
  ko: () => ko_default,
  km: () => km_default,
  kh: () => kh_default,
  ka: () => ka_default,
  ja: () => ja_default,
  it: () => it_default,
  is: () => is_default,
  id: () => id_default,
  hu: () => hu_default,
  he: () => he_default,
  frCA: () => fr_CA_default,
  fr: () => fr_default,
  fi: () => fi_default,
  fa: () => fa_default,
  es: () => es_default,
  eo: () => eo_default,
  en: () => en_default,
  de: () => de_default,
  da: () => da_default,
  cs: () => cs_default,
  ca: () => ca_default,
  bg: () => bg_default,
  be: () => be_default,
  az: () => az_default,
  ar: () => ar_default
});

// node_modules/zod/v4/locales/ar.js
var error = () => {
  const Sizable = {
    string: { unit: "حرف", verb: "أن يحوي" },
    file: { unit: "بايت", verb: "أن يحوي" },
    array: { unit: "عنصر", verb: "أن يحوي" },
    set: { unit: "عنصر", verb: "أن يحوي" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "مدخل",
    email: "بريد إلكتروني",
    url: "رابط",
    emoji: "إيموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاريخ ووقت بمعيار ISO",
    date: "تاريخ بمعيار ISO",
    time: "وقت بمعيار ISO",
    duration: "مدة بمعيار ISO",
    ipv4: "عنوان IPv4",
    ipv6: "عنوان IPv6",
    cidrv4: "مدى عناوين بصيغة IPv4",
    cidrv6: "مدى عناوين بصيغة IPv6",
    base64: "نَص بترميز base64-encoded",
    base64url: "نَص بترميز base64url-encoded",
    json_string: "نَص على هيئة JSON",
    e164: "رقم هاتف بمعيار E.164",
    jwt: "JWT",
    template_literal: "مدخل"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `مدخلات غير مقبولة: يفترض إدخال ${issue2.expected}، ولكن تم إدخال ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `مدخلات غير مقبولة: يفترض إدخال ${stringifyPrimitive(issue2.values[0])}`;
        return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return ` أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"}`;
        return `أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `نَص غير مقبول: يجب أن يبدأ بـ "${issue2.prefix}"`;
        if (_issue.format === "ends_with")
          return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} غير مقبول`;
      }
      case "not_multiple_of":
        return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue2.divisor}`;
      case "unrecognized_keys":
        return `معرف${issue2.keys.length > 1 ? "ات" : ""} غريب${issue2.keys.length > 1 ? "ة" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `معرف غير مقبول في ${issue2.origin}`;
      case "invalid_union":
        return "مدخل غير مقبول";
      case "invalid_element":
        return `مدخل غير مقبول في ${issue2.origin}`;
      default:
        return "مدخل غير مقبول";
    }
  };
};
function ar_default() {
  return {
    localeError: error()
  };
}
// node_modules/zod/v4/locales/az.js
var error2 = () => {
  const Sizable = {
    string: { unit: "simvol", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "element", verb: "olmalıdır" },
    set: { unit: "element", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Yanlış dəyər: gözlənilən ${issue2.expected}, daxil olan ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Yanlış dəyər: gözlənilən ${stringifyPrimitive(issue2.values[0])}`;
        return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Yanlış mətn: "${_issue.prefix}" ilə başlamalıdır`;
        if (_issue.format === "ends_with")
          return `Yanlış mətn: "${_issue.suffix}" ilə bitməlidir`;
        if (_issue.format === "includes")
          return `Yanlış mətn: "${_issue.includes}" daxil olmalıdır`;
        if (_issue.format === "regex")
          return `Yanlış mətn: ${_issue.pattern} şablonuna uyğun olmalıdır`;
        return `Yanlış ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Yanlış ədəd: ${issue2.divisor} ilə bölünə bilən olmalıdır`;
      case "unrecognized_keys":
        return `Tanınmayan açar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} daxilində yanlış açar`;
      case "invalid_union":
        return "Yanlış dəyər";
      case "invalid_element":
        return `${issue2.origin} daxilində yanlış dəyər`;
      default:
        return `Yanlış dəyər`;
    }
  };
};
function az_default() {
  return {
    localeError: error2()
  };
}
// node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
var error3 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "сімвал",
        few: "сімвалы",
        many: "сімвалаў"
      },
      verb: "мець"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    file: {
      unit: {
        one: "байт",
        few: "байты",
        many: "байтаў"
      },
      verb: "мець"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "лік";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "масіў";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "увод",
    email: "email адрас",
    url: "URL",
    emoji: "эмодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата і час",
    date: "ISO дата",
    time: "ISO час",
    duration: "ISO працягласць",
    ipv4: "IPv4 адрас",
    ipv6: "IPv6 адрас",
    cidrv4: "IPv4 дыяпазон",
    cidrv6: "IPv6 дыяпазон",
    base64: "радок у фармаце base64",
    base64url: "радок у фармаце base64url",
    json_string: "JSON радок",
    e164: "нумар E.164",
    jwt: "JWT",
    template_literal: "увод"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Няправільны ўвод: чакаўся ${issue2.expected}, атрымана ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Няправільны ўвод: чакалася ${stringifyPrimitive(issue2.values[0])}`;
        return `Няправільны варыянт: чакаўся адзін з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна быць ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта малы: чакалася, што ${issue2.origin} павінна ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Занадта малы: чакалася, што ${issue2.origin} павінна быць ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Няправільны радок: павінен пачынацца з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Няправільны радок: павінен заканчвацца на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Няправільны радок: павінен змяшчаць "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Няправільны радок: павінен адпавядаць шаблону ${_issue.pattern}`;
        return `Няправільны ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Няправільны лік: павінен быць кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспазнаны ${issue2.keys.length > 1 ? "ключы" : "ключ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Няправільны ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Няправільны ўвод";
      case "invalid_element":
        return `Няправільнае значэнне ў ${issue2.origin}`;
      default:
        return `Няправільны ўвод`;
    }
  };
};
function be_default() {
  return {
    localeError: error3()
  };
}
// node_modules/zod/v4/locales/bg.js
var parsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "число";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "масив";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error4 = () => {
  const Sizable = {
    string: { unit: "символа", verb: "да съдържа" },
    file: { unit: "байта", verb: "да съдържа" },
    array: { unit: "елемента", verb: "да съдържа" },
    set: { unit: "елемента", verb: "да съдържа" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "вход",
    email: "имейл адрес",
    url: "URL",
    emoji: "емоджи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO време",
    date: "ISO дата",
    time: "ISO време",
    duration: "ISO продължителност",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "base64-кодиран низ",
    base64url: "base64url-кодиран низ",
    json_string: "JSON низ",
    e164: "E.164 номер",
    jwt: "JWT",
    template_literal: "вход"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Невалиден вход: очакван ${issue2.expected}, получен ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Невалиден вход: очакван ${stringifyPrimitive(issue2.values[0])}`;
        return `Невалидна опция: очаквано едно от ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Твърде голямо: очаква се ${issue2.origin ?? "стойност"} да съдържа ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елемента"}`;
        return `Твърде голямо: очаква се ${issue2.origin ?? "стойност"} да бъде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Твърде малко: очаква се ${issue2.origin} да съдържа ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Твърде малко: очаква се ${issue2.origin} да бъде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Невалиден низ: трябва да започва с "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Невалиден низ: трябва да завършва с "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Невалиден низ: трябва да включва "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Невалиден низ: трябва да съвпада с ${_issue.pattern}`;
        let invalid_adj = "Невалиден";
        if (_issue.format === "emoji")
          invalid_adj = "Невалидно";
        if (_issue.format === "datetime")
          invalid_adj = "Невалидно";
        if (_issue.format === "date")
          invalid_adj = "Невалидна";
        if (_issue.format === "time")
          invalid_adj = "Невалидно";
        if (_issue.format === "duration")
          invalid_adj = "Невалидна";
        return `${invalid_adj} ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Невалидно число: трябва да бъде кратно на ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Неразпознат${issue2.keys.length > 1 ? "и" : ""} ключ${issue2.keys.length > 1 ? "ове" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Невалиден ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Невалиден вход";
      case "invalid_element":
        return `Невалидна стойност в ${issue2.origin}`;
      default:
        return `Невалиден вход`;
    }
  };
};
function bg_default() {
  return {
    localeError: error4()
  };
}
// node_modules/zod/v4/locales/ca.js
var error5 = () => {
  const Sizable = {
    string: { unit: "caràcters", verb: "contenir" },
    file: { unit: "bytes", verb: "contenir" },
    array: { unit: "elements", verb: "contenir" },
    set: { unit: "elements", verb: "contenir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType2 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrada",
    email: "adreça electrònica",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "durada ISO",
    ipv4: "adreça IPv4",
    ipv6: "adreça IPv6",
    cidrv4: "rang IPv4",
    cidrv6: "rang IPv6",
    base64: "cadena codificada en base64",
    base64url: "cadena codificada en base64url",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Tipus invàlid: s'esperava ${issue2.expected}, s'ha rebut ${parsedType2(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Valor invàlid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
        return `Opció invàlida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "com a màxim" : "menys de";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} contingués ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "com a mínim" : "més de";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Massa petit: s'esperava que ${issue2.origin} contingués ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Format invàlid: ha de començar amb "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Format invàlid: ha d'acabar amb "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Format invàlid: ha d'incloure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Format invàlid: ha de coincidir amb el patró ${_issue.pattern}`;
        return `Format invàlid per a ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número invàlid: ha de ser múltiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clau invàlida a ${issue2.origin}`;
      case "invalid_union":
        return "Entrada invàlida";
      case "invalid_element":
        return `Element invàlid a ${issue2.origin}`;
      default:
        return `Entrada invàlida`;
    }
  };
};
function ca_default() {
  return {
    localeError: error5()
  };
}
// node_modules/zod/v4/locales/cs.js
var error6 = () => {
  const Sizable = {
    string: { unit: "znaků", verb: "mít" },
    file: { unit: "bajtů", verb: "mít" },
    array: { unit: "prvků", verb: "mít" },
    set: { unit: "prvků", verb: "mít" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType2 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "číslo";
      }
      case "string": {
        return "řetězec";
      }
      case "boolean": {
        return "boolean";
      }
      case "bigint": {
        return "bigint";
      }
      case "function": {
        return "funkce";
      }
      case "symbol": {
        return "symbol";
      }
      case "undefined": {
        return "undefined";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "pole";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "regulární výraz",
    email: "e-mailová adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "datum a čas ve formátu ISO",
    date: "datum ve formátu ISO",
    time: "čas ve formátu ISO",
    duration: "doba trvání ISO",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "rozsah IPv4",
    cidrv6: "rozsah IPv6",
    base64: "řetězec zakódovaný ve formátu base64",
    base64url: "řetězec zakódovaný ve formátu base64url",
    json_string: "řetězec ve formátu JSON",
    e164: "číslo E.164",
    jwt: "JWT",
    template_literal: "vstup"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Neplatný vstup: očekáváno ${issue2.expected}, obdrženo ${parsedType2(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neplatný vstup: očekáváno ${stringifyPrimitive(issue2.values[0])}`;
        return `Neplatná možnost: očekávána jedna z hodnot ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neplatný řetězec: musí začínat na "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neplatný řetězec: musí končit na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neplatný řetězec: musí obsahovat "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neplatný řetězec: musí odpovídat vzoru ${_issue.pattern}`;
        return `Neplatný formát ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neplatné číslo: musí být násobkem ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neznámé klíče: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neplatný klíč v ${issue2.origin}`;
      case "invalid_union":
        return "Neplatný vstup";
      case "invalid_element":
        return `Neplatná hodnota v ${issue2.origin}`;
      default:
        return `Neplatný vstup`;
    }
  };
};
function cs_default() {
  return {
    localeError: error6()
  };
}
// node_modules/zod/v4/locales/da.js
var error7 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "havde" },
    file: { unit: "bytes", verb: "havde" },
    array: { unit: "elementer", verb: "indeholdt" },
    set: { unit: "elementer", verb: "indeholdt" }
  };
  const TypeNames = {
    string: "streng",
    number: "tal",
    boolean: "boolean",
    array: "liste",
    object: "objekt",
    set: "sæt",
    file: "fil"
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  function getTypeName(type) {
    return TypeNames[type] ?? type;
  }
  const parsedType2 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "tal";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "liste";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return "objekt";
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "e-mailadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslæt",
    date: "ISO-dato",
    time: "ISO-klokkeslæt",
    duration: "ISO-varighed",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodet streng",
    base64url: "base64url-kodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ugyldigt input: forventede ${getTypeName(issue2.expected)}, fik ${getTypeName(parsedType2(issue2.input))}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig værdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldigt valg: forventede en af følgende ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing)
          return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing) {
          return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: skal matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldigt tal: skal være deleligt med ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukendte nøgler" : "Ukendt nøgle"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøgle i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldigt input: matcher ingen af de tilladte typer";
      case "invalid_element":
        return `Ugyldig værdi i ${issue2.origin}`;
      default:
        return `Ugyldigt input`;
    }
  };
};
function da_default() {
  return {
    localeError: error7()
  };
}
// node_modules/zod/v4/locales/de.js
var error8 = () => {
  const Sizable = {
    string: { unit: "Zeichen", verb: "zu haben" },
    file: { unit: "Bytes", verb: "zu haben" },
    array: { unit: "Elemente", verb: "zu haben" },
    set: { unit: "Elemente", verb: "zu haben" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType2 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "Zahl";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "Array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "Eingabe",
    email: "E-Mail-Adresse",
    url: "URL",
    emoji: "Emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-Datum und -Uhrzeit",
    date: "ISO-Datum",
    time: "ISO-Uhrzeit",
    duration: "ISO-Dauer",
    ipv4: "IPv4-Adresse",
    ipv6: "IPv6-Adresse",
    cidrv4: "IPv4-Bereich",
    cidrv6: "IPv6-Bereich",
    base64: "Base64-codierter String",
    base64url: "Base64-URL-codierter String",
    json_string: "JSON-String",
    e164: "E.164-Nummer",
    jwt: "JWT",
    template_literal: "Eingabe"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ungültige Eingabe: erwartet ${issue2.expected}, erhalten ${parsedType2(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ungültige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ungültige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
        return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ist`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
        }
        return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ungültiger String: muss mit "${_issue.prefix}" beginnen`;
        if (_issue.format === "ends_with")
          return `Ungültiger String: muss mit "${_issue.suffix}" enden`;
        if (_issue.format === "includes")
          return `Ungültiger String: muss "${_issue.includes}" enthalten`;
        if (_issue.format === "regex")
          return `Ungültiger String: muss dem Muster ${_issue.pattern} entsprechen`;
        return `Ungültig: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ungültige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Unbekannte Schlüssel" : "Unbekannter Schlüssel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ungültiger Schlüssel in ${issue2.origin}`;
      case "invalid_union":
        return "Ungültige Eingabe";
      case "invalid_element":
        return `Ungültiger Wert in ${issue2.origin}`;
      default:
        return `Ungültige Eingabe`;
    }
  };
};
function de_default() {
  return {
    localeError: error8()
  };
}
// node_modules/zod/v4/locales/en.js
var parsedType2 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "number";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error9 = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Invalid input: expected ${issue2.expected}, received ${parsedType2(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en_default() {
  return {
    localeError: error9()
  };
}
// node_modules/zod/v4/locales/eo.js
var parsedType3 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "nombro";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "tabelo";
      }
      if (data === null) {
        return "senvalora";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error10 = () => {
  const Sizable = {
    string: { unit: "karaktrojn", verb: "havi" },
    file: { unit: "bajtojn", verb: "havi" },
    array: { unit: "elementojn", verb: "havi" },
    set: { unit: "elementojn", verb: "havi" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "enigo",
    email: "retadreso",
    url: "URL",
    emoji: "emoĝio",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datotempo",
    date: "ISO-dato",
    time: "ISO-tempo",
    duration: "ISO-daŭro",
    ipv4: "IPv4-adreso",
    ipv6: "IPv6-adreso",
    cidrv4: "IPv4-rango",
    cidrv6: "IPv6-rango",
    base64: "64-ume kodita karaktraro",
    base64url: "URL-64-ume kodita karaktraro",
    json_string: "JSON-karaktraro",
    e164: "E.164-nombro",
    jwt: "JWT",
    template_literal: "enigo"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Nevalida enigo: atendiĝis ${issue2.expected}, riceviĝis ${parsedType3(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nevalida enigo: atendiĝis ${stringifyPrimitive(issue2.values[0])}`;
        return `Nevalida opcio: atendiĝis unu el ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
        return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Tro malgranda: atendiĝis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Tro malgranda: atendiĝis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nevalida karaktraro: devas komenciĝi per "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nevalida karaktraro: devas finiĝi per "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
        return `Nevalida ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nekonata${issue2.keys.length > 1 ? "j" : ""} ŝlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nevalida ŝlosilo en ${issue2.origin}`;
      case "invalid_union":
        return "Nevalida enigo";
      case "invalid_element":
        return `Nevalida valoro en ${issue2.origin}`;
      default:
        return `Nevalida enigo`;
    }
  };
};
function eo_default() {
  return {
    localeError: error10()
  };
}
// node_modules/zod/v4/locales/es.js
var error11 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "tener" },
    file: { unit: "bytes", verb: "tener" },
    array: { unit: "elementos", verb: "tener" },
    set: { unit: "elementos", verb: "tener" }
  };
  const TypeNames = {
    string: "texto",
    number: "número",
    boolean: "booleano",
    array: "arreglo",
    object: "objeto",
    set: "conjunto",
    file: "archivo",
    date: "fecha",
    bigint: "número grande",
    symbol: "símbolo",
    undefined: "indefinido",
    null: "nulo",
    function: "función",
    map: "mapa",
    record: "registro",
    tuple: "tupla",
    enum: "enumeración",
    union: "unión",
    literal: "literal",
    promise: "promesa",
    void: "vacío",
    never: "nunca",
    unknown: "desconocido",
    any: "cualquiera"
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  function getTypeName(type) {
    return TypeNames[type] ?? type;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype) {
          return data.constructor.name;
        }
        return "object";
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrada",
    email: "dirección de correo electrónico",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "fecha y hora ISO",
    date: "fecha ISO",
    time: "hora ISO",
    duration: "duración ISO",
    ipv4: "dirección IPv4",
    ipv6: "dirección IPv6",
    cidrv4: "rango IPv4",
    cidrv6: "rango IPv6",
    base64: "cadena codificada en base64",
    base64url: "URL codificada en base64",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Entrada inválida: se esperaba ${getTypeName(issue2.expected)}, recibido ${getTypeName(parsedType4(issue2.input))}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
        return `Opción inválida: se esperaba una de ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing)
          return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing) {
          return `Demasiado pequeño: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Demasiado pequeño: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Cadena inválida: debe comenzar con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Cadena inválida: debe terminar en "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cadena inválida: debe incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cadena inválida: debe coincidir con el patrón ${_issue.pattern}`;
        return `Inválido ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número inválido: debe ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Llave inválida en ${getTypeName(issue2.origin)}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido en ${getTypeName(issue2.origin)}`;
      default:
        return `Entrada inválida`;
    }
  };
};
function es_default() {
  return {
    localeError: error11()
  };
}
// node_modules/zod/v4/locales/fa.js
var error12 = () => {
  const Sizable = {
    string: { unit: "کاراکتر", verb: "داشته باشد" },
    file: { unit: "بایت", verb: "داشته باشد" },
    array: { unit: "آیتم", verb: "داشته باشد" },
    set: { unit: "آیتم", verb: "داشته باشد" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "عدد";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "آرایه";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ورودی",
    email: "آدرس ایمیل",
    url: "URL",
    emoji: "ایموجی",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاریخ و زمان ایزو",
    date: "تاریخ ایزو",
    time: "زمان ایزو",
    duration: "مدت زمان ایزو",
    ipv4: "IPv4 آدرس",
    ipv6: "IPv6 آدرس",
    cidrv4: "IPv4 دامنه",
    cidrv6: "IPv6 دامنه",
    base64: "base64-encoded رشته",
    base64url: "base64url-encoded رشته",
    json_string: "JSON رشته",
    e164: "E.164 عدد",
    jwt: "JWT",
    template_literal: "ورودی"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ورودی نامعتبر: می‌بایست ${issue2.expected} می‌بود، ${parsedType4(issue2.input)} دریافت شد`;
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ورودی نامعتبر: می‌بایست ${stringifyPrimitive(issue2.values[0])} می‌بود`;
        }
        return `گزینه نامعتبر: می‌بایست یکی از ${joinValues(issue2.values, "|")} می‌بود`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"} باشد`;
        }
        return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} باشد`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} باشد`;
        }
        return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} باشد`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `رشته نامعتبر: باید با "${_issue.prefix}" شروع شود`;
        }
        if (_issue.format === "ends_with") {
          return `رشته نامعتبر: باید با "${_issue.suffix}" تمام شود`;
        }
        if (_issue.format === "includes") {
          return `رشته نامعتبر: باید شامل "${_issue.includes}" باشد`;
        }
        if (_issue.format === "regex") {
          return `رشته نامعتبر: باید با الگوی ${_issue.pattern} مطابقت داشته باشد`;
        }
        return `${Nouns[_issue.format] ?? issue2.format} نامعتبر`;
      }
      case "not_multiple_of":
        return `عدد نامعتبر: باید مضرب ${issue2.divisor} باشد`;
      case "unrecognized_keys":
        return `کلید${issue2.keys.length > 1 ? "های" : ""} ناشناس: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `کلید ناشناس در ${issue2.origin}`;
      case "invalid_union":
        return `ورودی نامعتبر`;
      case "invalid_element":
        return `مقدار نامعتبر در ${issue2.origin}`;
      default:
        return `ورودی نامعتبر`;
    }
  };
};
function fa_default() {
  return {
    localeError: error12()
  };
}
// node_modules/zod/v4/locales/fi.js
var error13 = () => {
  const Sizable = {
    string: { unit: "merkkiä", subject: "merkkijonon" },
    file: { unit: "tavua", subject: "tiedoston" },
    array: { unit: "alkiota", subject: "listan" },
    set: { unit: "alkiota", subject: "joukon" },
    number: { unit: "", subject: "luvun" },
    bigint: { unit: "", subject: "suuren kokonaisluvun" },
    int: { unit: "", subject: "kokonaisluvun" },
    date: { unit: "", subject: "päivämäärän" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "säännöllinen lauseke",
    email: "sähköpostiosoite",
    url: "URL-osoite",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-aikaleima",
    date: "ISO-päivämäärä",
    time: "ISO-aika",
    duration: "ISO-kesto",
    ipv4: "IPv4-osoite",
    ipv6: "IPv6-osoite",
    cidrv4: "IPv4-alue",
    cidrv6: "IPv6-alue",
    base64: "base64-koodattu merkkijono",
    base64url: "base64url-koodattu merkkijono",
    json_string: "JSON-merkkijono",
    e164: "E.164-luku",
    jwt: "JWT",
    template_literal: "templaattimerkkijono"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Virheellinen tyyppi: odotettiin ${issue2.expected}, oli ${parsedType4(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Virheellinen syöte: täytyy olla ${stringifyPrimitive(issue2.values[0])}`;
        return `Virheellinen valinta: täytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian suuri: ${sizing.subject} täytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian suuri: arvon täytyy olla ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian pieni: ${sizing.subject} täytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian pieni: arvon täytyy olla ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Virheellinen syöte: täytyy alkaa "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Virheellinen syöte: täytyy loppua "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Virheellinen syöte: täytyy sisältää "${_issue.includes}"`;
        if (_issue.format === "regex") {
          return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${_issue.pattern}`;
        }
        return `Virheellinen ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Virheellinen luku: täytyy olla luvun ${issue2.divisor} monikerta`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Virheellinen avain tietueessa";
      case "invalid_union":
        return "Virheellinen unioni";
      case "invalid_element":
        return "Virheellinen arvo joukossa";
      default:
        return `Virheellinen syöte`;
    }
  };
};
function fi_default() {
  return {
    localeError: error13()
  };
}
// node_modules/zod/v4/locales/fr.js
var error14 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nombre";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tableau";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrée",
    email: "adresse e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date et heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Entrée invalide : ${issue2.expected} attendu, ${parsedType4(issue2.input)} reçu`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : ${issue2.origin ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "élément(s)"}`;
        return `Trop grand : ${issue2.origin ?? "valeur"} doit être ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : ${issue2.origin} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : ${issue2.origin} doit être ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au modèle ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
function fr_default() {
  return {
    localeError: error14()
  };
}
// node_modules/zod/v4/locales/fr-CA.js
var error15 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrée",
    email: "adresse courriel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date-heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Entrée invalide : attendu ${issue2.expected}, reçu ${parsedType4(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "≤" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "≥" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au motif ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
function fr_CA_default() {
  return {
    localeError: error15()
  };
}
// node_modules/zod/v4/locales/he.js
var error16 = () => {
  const TypeNames = {
    string: { label: "מחרוזת", gender: "f" },
    number: { label: "מספר", gender: "m" },
    boolean: { label: "ערך בוליאני", gender: "m" },
    bigint: { label: "BigInt", gender: "m" },
    date: { label: "תאריך", gender: "m" },
    array: { label: "מערך", gender: "m" },
    object: { label: "אובייקט", gender: "m" },
    null: { label: "ערך ריק (null)", gender: "m" },
    undefined: { label: "ערך לא מוגדר (undefined)", gender: "m" },
    symbol: { label: "סימבול (Symbol)", gender: "m" },
    function: { label: "פונקציה", gender: "f" },
    map: { label: "מפה (Map)", gender: "f" },
    set: { label: "קבוצה (Set)", gender: "f" },
    file: { label: "קובץ", gender: "m" },
    promise: { label: "Promise", gender: "m" },
    NaN: { label: "NaN", gender: "m" },
    unknown: { label: "ערך לא ידוע", gender: "m" },
    value: { label: "ערך", gender: "m" }
  };
  const Sizable = {
    string: { unit: "תווים", shortLabel: "קצר", longLabel: "ארוך" },
    file: { unit: "בייטים", shortLabel: "קטן", longLabel: "גדול" },
    array: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
    set: { unit: "פריטים", shortLabel: "קטן", longLabel: "גדול" },
    number: { unit: "", shortLabel: "קטן", longLabel: "גדול" }
  };
  const typeEntry = (t) => t ? TypeNames[t] : undefined;
  const typeLabel = (t) => {
    const e = typeEntry(t);
    if (e)
      return e.label;
    return t ?? TypeNames.unknown.label;
  };
  const withDefinite = (t) => `ה${typeLabel(t)}`;
  const verbFor = (t) => {
    const e = typeEntry(t);
    const gender = e?.gender ?? "m";
    return gender === "f" ? "צריכה להיות" : "צריך להיות";
  };
  const getSizing = (origin) => {
    if (!origin)
      return null;
    return Sizable[origin] ?? null;
  };
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number":
        return Number.isNaN(data) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(data))
          return "array";
        if (data === null)
          return "null";
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return "object";
      }
      default:
        return t;
    }
  };
  const Nouns = {
    regex: { label: "קלט", gender: "m" },
    email: { label: "כתובת אימייל", gender: "f" },
    url: { label: "כתובת רשת", gender: "f" },
    emoji: { label: "אימוג'י", gender: "m" },
    uuid: { label: "UUID", gender: "m" },
    nanoid: { label: "nanoid", gender: "m" },
    guid: { label: "GUID", gender: "m" },
    cuid: { label: "cuid", gender: "m" },
    cuid2: { label: "cuid2", gender: "m" },
    ulid: { label: "ULID", gender: "m" },
    xid: { label: "XID", gender: "m" },
    ksuid: { label: "KSUID", gender: "m" },
    datetime: { label: "תאריך וזמן ISO", gender: "m" },
    date: { label: "תאריך ISO", gender: "m" },
    time: { label: "זמן ISO", gender: "m" },
    duration: { label: "משך זמן ISO", gender: "m" },
    ipv4: { label: "כתובת IPv4", gender: "f" },
    ipv6: { label: "כתובת IPv6", gender: "f" },
    cidrv4: { label: "טווח IPv4", gender: "m" },
    cidrv6: { label: "טווח IPv6", gender: "m" },
    base64: { label: "מחרוזת בבסיס 64", gender: "f" },
    base64url: { label: "מחרוזת בבסיס 64 לכתובות רשת", gender: "f" },
    json_string: { label: "מחרוזת JSON", gender: "f" },
    e164: { label: "מספר E.164", gender: "m" },
    jwt: { label: "JWT", gender: "m" },
    ends_with: { label: "קלט", gender: "m" },
    includes: { label: "קלט", gender: "m" },
    lowercase: { label: "קלט", gender: "m" },
    starts_with: { label: "קלט", gender: "m" },
    uppercase: { label: "קלט", gender: "m" }
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type": {
        const expectedKey = issue2.expected;
        const expected = typeLabel(expectedKey);
        const receivedKey = parsedType4(issue2.input);
        const received = TypeNames[receivedKey]?.label ?? receivedKey;
        return `קלט לא תקין: צריך להיות ${expected}, התקבל ${received}`;
      }
      case "invalid_value": {
        if (issue2.values.length === 1) {
          return `ערך לא תקין: הערך חייב להיות ${stringifyPrimitive(issue2.values[0])}`;
        }
        const stringified = issue2.values.map((v) => stringifyPrimitive(v));
        if (issue2.values.length === 2) {
          return `ערך לא תקין: האפשרויות המתאימות הן ${stringified[0]} או ${stringified[1]}`;
        }
        const lastValue = stringified[stringified.length - 1];
        const restValues = stringified.slice(0, -1).join(", ");
        return `ערך לא תקין: האפשרויות המתאימות הן ${restValues} או ${lastValue}`;
      }
      case "too_big": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite(issue2.origin ?? "value");
        if (issue2.origin === "string") {
          return `${sizing?.longLabel ?? "ארוך"} מדי: ${subject} צריכה להכיל ${issue2.maximum.toString()} ${sizing?.unit ?? ""} ${issue2.inclusive ? "או פחות" : "לכל היותר"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `קטן או שווה ל-${issue2.maximum}` : `קטן מ-${issue2.maximum}`;
          return `גדול מדי: ${subject} צריך להיות ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "צריכה" : "צריך";
          const comparison = issue2.inclusive ? `${issue2.maximum} ${sizing?.unit ?? ""} או פחות` : `פחות מ-${issue2.maximum} ${sizing?.unit ?? ""}`;
          return `גדול מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? "<=" : "<";
        const be = verbFor(issue2.origin ?? "value");
        if (sizing?.unit) {
          return `${sizing.longLabel} מדי: ${subject} ${be} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        }
        return `${sizing?.longLabel ?? "גדול"} מדי: ${subject} ${be} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const sizing = getSizing(issue2.origin);
        const subject = withDefinite(issue2.origin ?? "value");
        if (issue2.origin === "string") {
          return `${sizing?.shortLabel ?? "קצר"} מדי: ${subject} צריכה להכיל ${issue2.minimum.toString()} ${sizing?.unit ?? ""} ${issue2.inclusive ? "או יותר" : "לפחות"}`.trim();
        }
        if (issue2.origin === "number") {
          const comparison = issue2.inclusive ? `גדול או שווה ל-${issue2.minimum}` : `גדול מ-${issue2.minimum}`;
          return `קטן מדי: ${subject} צריך להיות ${comparison}`;
        }
        if (issue2.origin === "array" || issue2.origin === "set") {
          const verb = issue2.origin === "set" ? "צריכה" : "צריך";
          if (issue2.minimum === 1 && issue2.inclusive) {
            const singularPhrase = issue2.origin === "set" ? "לפחות פריט אחד" : "לפחות פריט אחד";
            return `קטן מדי: ${subject} ${verb} להכיל ${singularPhrase}`;
          }
          const comparison = issue2.inclusive ? `${issue2.minimum} ${sizing?.unit ?? ""} או יותר` : `יותר מ-${issue2.minimum} ${sizing?.unit ?? ""}`;
          return `קטן מדי: ${subject} ${verb} להכיל ${comparison}`.trim();
        }
        const adj = issue2.inclusive ? ">=" : ">";
        const be = verbFor(issue2.origin ?? "value");
        if (sizing?.unit) {
          return `${sizing.shortLabel} מדי: ${subject} ${be} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `${sizing?.shortLabel ?? "קטן"} מדי: ${subject} ${be} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `המחרוזת חייבת להתחיל ב "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `המחרוזת חייבת להסתיים ב "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `המחרוזת חייבת לכלול "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `המחרוזת חייבת להתאים לתבנית ${_issue.pattern}`;
        const nounEntry = Nouns[_issue.format];
        const noun = nounEntry?.label ?? _issue.format;
        const gender = nounEntry?.gender ?? "m";
        const adjective = gender === "f" ? "תקינה" : "תקין";
        return `${noun} לא ${adjective}`;
      }
      case "not_multiple_of":
        return `מספר לא תקין: חייב להיות מכפלה של ${issue2.divisor}`;
      case "unrecognized_keys":
        return `מפתח${issue2.keys.length > 1 ? "ות" : ""} לא מזוה${issue2.keys.length > 1 ? "ים" : "ה"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key": {
        return `שדה לא תקין באובייקט`;
      }
      case "invalid_union":
        return "קלט לא תקין";
      case "invalid_element": {
        const place = withDefinite(issue2.origin ?? "array");
        return `ערך לא תקין ב${place}`;
      }
      default:
        return `קלט לא תקין`;
    }
  };
};
function he_default() {
  return {
    localeError: error16()
  };
}
// node_modules/zod/v4/locales/hu.js
var error17 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "legyen" },
    file: { unit: "byte", verb: "legyen" },
    array: { unit: "elem", verb: "legyen" },
    set: { unit: "elem", verb: "legyen" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "szám";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tömb";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "bemenet",
    email: "email cím",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO időbélyeg",
    date: "ISO dátum",
    time: "ISO idő",
    duration: "ISO időintervallum",
    ipv4: "IPv4 cím",
    ipv6: "IPv6 cím",
    cidrv4: "IPv4 tartomány",
    cidrv6: "IPv6 tartomány",
    base64: "base64-kódolt string",
    base64url: "base64url-kódolt string",
    json_string: "JSON string",
    e164: "E.164 szám",
    jwt: "JWT",
    template_literal: "bemenet"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Érvénytelen bemenet: a várt érték ${issue2.expected}, a kapott érték ${parsedType4(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Érvénytelen bemenet: a várt érték ${stringifyPrimitive(issue2.values[0])}`;
        return `Érvénytelen opció: valamelyik érték várt ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Túl nagy: ${issue2.origin ?? "érték"} mérete túl nagy ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elem"}`;
        return `Túl nagy: a bemeneti érték ${issue2.origin ?? "érték"} túl nagy: ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Túl kicsi: a bemeneti érték ${issue2.origin} mérete túl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Túl kicsi: a bemeneti érték ${issue2.origin} túl kicsi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Érvénytelen string: "${_issue.prefix}" értékkel kell kezdődnie`;
        if (_issue.format === "ends_with")
          return `Érvénytelen string: "${_issue.suffix}" értékkel kell végződnie`;
        if (_issue.format === "includes")
          return `Érvénytelen string: "${_issue.includes}" értéket kell tartalmaznia`;
        if (_issue.format === "regex")
          return `Érvénytelen string: ${_issue.pattern} mintának kell megfelelnie`;
        return `Érvénytelen ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Érvénytelen szám: ${issue2.divisor} többszörösének kell lennie`;
      case "unrecognized_keys":
        return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Érvénytelen kulcs ${issue2.origin}`;
      case "invalid_union":
        return "Érvénytelen bemenet";
      case "invalid_element":
        return `Érvénytelen érték: ${issue2.origin}`;
      default:
        return `Érvénytelen bemenet`;
    }
  };
};
function hu_default() {
  return {
    localeError: error17()
  };
}
// node_modules/zod/v4/locales/id.js
var error18 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "memiliki" },
    file: { unit: "byte", verb: "memiliki" },
    array: { unit: "item", verb: "memiliki" },
    set: { unit: "item", verb: "memiliki" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "alamat email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tanggal dan waktu format ISO",
    date: "tanggal format ISO",
    time: "jam format ISO",
    duration: "durasi format ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "rentang alamat IPv4",
    cidrv6: "rentang alamat IPv6",
    base64: "string dengan enkode base64",
    base64url: "string dengan enkode base64url",
    json_string: "string JSON",
    e164: "angka E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Input tidak valid: diharapkan ${issue2.expected}, diterima ${parsedType4(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} memiliki ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} menjadi ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak valid: harus menyertakan "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} tidak valid`;
      }
      case "not_multiple_of":
        return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak valid di ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak valid";
      case "invalid_element":
        return `Nilai tidak valid di ${issue2.origin}`;
      default:
        return `Input tidak valid`;
    }
  };
};
function id_default() {
  return {
    localeError: error18()
  };
}
// node_modules/zod/v4/locales/is.js
var parsedType4 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "númer";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "fylki";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error19 = () => {
  const Sizable = {
    string: { unit: "stafi", verb: "að hafa" },
    file: { unit: "bæti", verb: "að hafa" },
    array: { unit: "hluti", verb: "að hafa" },
    set: { unit: "hluti", verb: "að hafa" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "gildi",
    email: "netfang",
    url: "vefslóð",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dagsetning og tími",
    date: "ISO dagsetning",
    time: "ISO tími",
    duration: "ISO tímalengd",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded strengur",
    base64url: "base64url-encoded strengur",
    json_string: "JSON strengur",
    e164: "E.164 tölugildi",
    jwt: "JWT",
    template_literal: "gildi"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Rangt gildi: Þú slóst inn ${parsedType4(issue2.input)} þar sem á að vera ${issue2.expected}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Rangt gildi: gert ráð fyrir ${stringifyPrimitive(issue2.values[0])}`;
        return `Ógilt val: má vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} hafi ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "hluti"}`;
        return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} sé ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Of lítið: gert er ráð fyrir að ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Of lítið: gert er ráð fyrir að ${issue2.origin} sé ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ógildur strengur: verður að byrja á "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ógildur strengur: verður að enda á "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ógildur strengur: verður að innihalda "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ógildur strengur: verður að fylgja mynstri ${_issue.pattern}`;
        return `Rangt ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Röng tala: verður að vera margfeldi af ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Óþekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Rangur lykill í ${issue2.origin}`;
      case "invalid_union":
        return "Rangt gildi";
      case "invalid_element":
        return `Rangt gildi í ${issue2.origin}`;
      default:
        return `Rangt gildi`;
    }
  };
};
function is_default() {
  return {
    localeError: error19()
  };
}
// node_modules/zod/v4/locales/it.js
var error20 = () => {
  const Sizable = {
    string: { unit: "caratteri", verb: "avere" },
    file: { unit: "byte", verb: "avere" },
    array: { unit: "elementi", verb: "avere" },
    set: { unit: "elementi", verb: "avere" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType5 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "numero";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "vettore";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "indirizzo email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e ora ISO",
    date: "data ISO",
    time: "ora ISO",
    duration: "durata ISO",
    ipv4: "indirizzo IPv4",
    ipv6: "indirizzo IPv6",
    cidrv4: "intervallo IPv4",
    cidrv6: "intervallo IPv6",
    base64: "stringa codificata in base64",
    base64url: "URL codificata in base64",
    json_string: "stringa JSON",
    e164: "numero E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Input non valido: atteso ${issue2.expected}, ricevuto ${parsedType5(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
        return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Troppo grande: ${issue2.origin ?? "valore"} deve avere ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementi"}`;
        return `Troppo grande: ${issue2.origin ?? "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Stringa non valida: deve includere "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chiave non valida in ${issue2.origin}`;
      case "invalid_union":
        return "Input non valido";
      case "invalid_element":
        return `Valore non valido in ${issue2.origin}`;
      default:
        return `Input non valido`;
    }
  };
};
function it_default() {
  return {
    localeError: error20()
  };
}
// node_modules/zod/v4/locales/ja.js
var error21 = () => {
  const Sizable = {
    string: { unit: "文字", verb: "である" },
    file: { unit: "バイト", verb: "である" },
    array: { unit: "要素", verb: "である" },
    set: { unit: "要素", verb: "である" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType5 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "数値";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "配列";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "入力値",
    email: "メールアドレス",
    url: "URL",
    emoji: "絵文字",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日時",
    date: "ISO日付",
    time: "ISO時刻",
    duration: "ISO期間",
    ipv4: "IPv4アドレス",
    ipv6: "IPv6アドレス",
    cidrv4: "IPv4範囲",
    cidrv6: "IPv6範囲",
    base64: "base64エンコード文字列",
    base64url: "base64urlエンコード文字列",
    json_string: "JSON文字列",
    e164: "E.164番号",
    jwt: "JWT",
    template_literal: "入力値"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `無効な入力: ${issue2.expected}が期待されましたが、${parsedType5(issue2.input)}が入力されました`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無効な入力: ${stringifyPrimitive(issue2.values[0])}が期待されました`;
        return `無効な選択: ${joinValues(issue2.values, "、")}のいずれかである必要があります`;
      case "too_big": {
        const adj = issue2.inclusive ? "以下である" : "より小さい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${sizing.unit ?? "要素"}${adj}必要があります`;
        return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${adj}必要があります`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "以上である" : "より大きい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${sizing.unit}${adj}必要があります`;
        return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${adj}必要があります`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `無効な文字列: "${_issue.prefix}"で始まる必要があります`;
        if (_issue.format === "ends_with")
          return `無効な文字列: "${_issue.suffix}"で終わる必要があります`;
        if (_issue.format === "includes")
          return `無効な文字列: "${_issue.includes}"を含む必要があります`;
        if (_issue.format === "regex")
          return `無効な文字列: パターン${_issue.pattern}に一致する必要があります`;
        return `無効な${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無効な数値: ${issue2.divisor}の倍数である必要があります`;
      case "unrecognized_keys":
        return `認識されていないキー${issue2.keys.length > 1 ? "群" : ""}: ${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin}内の無効なキー`;
      case "invalid_union":
        return "無効な入力";
      case "invalid_element":
        return `${issue2.origin}内の無効な値`;
      default:
        return `無効な入力`;
    }
  };
};
function ja_default() {
  return {
    localeError: error21()
  };
}
// node_modules/zod/v4/locales/ka.js
var parsedType5 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "რიცხვი";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "მასივი";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  const typeMap = {
    string: "სტრინგი",
    boolean: "ბულეანი",
    undefined: "undefined",
    bigint: "bigint",
    symbol: "symbol",
    function: "ფუნქცია"
  };
  return typeMap[t] ?? t;
};
var error22 = () => {
  const Sizable = {
    string: { unit: "სიმბოლო", verb: "უნდა შეიცავდეს" },
    file: { unit: "ბაიტი", verb: "უნდა შეიცავდეს" },
    array: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" },
    set: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "შეყვანა",
    email: "ელ-ფოსტის მისამართი",
    url: "URL",
    emoji: "ემოჯი",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "თარიღი-დრო",
    date: "თარიღი",
    time: "დრო",
    duration: "ხანგრძლივობა",
    ipv4: "IPv4 მისამართი",
    ipv6: "IPv6 მისამართი",
    cidrv4: "IPv4 დიაპაზონი",
    cidrv6: "IPv6 დიაპაზონი",
    base64: "base64-კოდირებული სტრინგი",
    base64url: "base64url-კოდირებული სტრინგი",
    json_string: "JSON სტრინგი",
    e164: "E.164 ნომერი",
    jwt: "JWT",
    template_literal: "შეყვანა"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `არასწორი შეყვანა: მოსალოდნელი ${issue2.expected}, მიღებული ${parsedType5(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `არასწორი შეყვანა: მოსალოდნელი ${stringifyPrimitive(issue2.values[0])}`;
        return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${joinValues(issue2.values, "|")}-დან`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} იყოს ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} იყოს ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `არასწორი სტრინგი: უნდა იწყებოდეს "${_issue.prefix}"-ით`;
        }
        if (_issue.format === "ends_with")
          return `არასწორი სტრინგი: უნდა მთავრდებოდეს "${_issue.suffix}"-ით`;
        if (_issue.format === "includes")
          return `არასწორი სტრინგი: უნდა შეიცავდეს "${_issue.includes}"-ს`;
        if (_issue.format === "regex")
          return `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${_issue.pattern}`;
        return `არასწორი ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `არასწორი რიცხვი: უნდა იყოს ${issue2.divisor}-ის ჯერადი`;
      case "unrecognized_keys":
        return `უცნობი გასაღებ${issue2.keys.length > 1 ? "ები" : "ი"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `არასწორი გასაღები ${issue2.origin}-ში`;
      case "invalid_union":
        return "არასწორი შეყვანა";
      case "invalid_element":
        return `არასწორი მნიშვნელობა ${issue2.origin}-ში`;
      default:
        return `არასწორი შეყვანა`;
    }
  };
};
function ka_default() {
  return {
    localeError: error22()
  };
}
// node_modules/zod/v4/locales/km.js
var error23 = () => {
  const Sizable = {
    string: { unit: "តួអក្សរ", verb: "គួរមាន" },
    file: { unit: "បៃ", verb: "គួរមាន" },
    array: { unit: "ធាតុ", verb: "គួរមាន" },
    set: { unit: "ធាតុ", verb: "គួរមាន" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "មិនមែនជាលេខ (NaN)" : "លេខ";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "អារេ (Array)";
        }
        if (data === null) {
          return "គ្មានតម្លៃ (null)";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ទិន្នន័យបញ្ចូល",
    email: "អាសយដ្ឋានអ៊ីមែល",
    url: "URL",
    emoji: "សញ្ញាអារម្មណ៍",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "កាលបរិច្ឆេទ និងម៉ោង ISO",
    date: "កាលបរិច្ឆេទ ISO",
    time: "ម៉ោង ISO",
    duration: "រយៈពេល ISO",
    ipv4: "អាសយដ្ឋាន IPv4",
    ipv6: "អាសយដ្ឋាន IPv6",
    cidrv4: "ដែនអាសយដ្ឋាន IPv4",
    cidrv6: "ដែនអាសយដ្ឋាន IPv6",
    base64: "ខ្សែអក្សរអ៊ិកូដ base64",
    base64url: "ខ្សែអក្សរអ៊ិកូដ base64url",
    json_string: "ខ្សែអក្សរ JSON",
    e164: "លេខ E.164",
    jwt: "JWT",
    template_literal: "ទិន្នន័យបញ្ចូល"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${issue2.expected} ប៉ុន្តែទទួលបាន ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${stringifyPrimitive(issue2.values[0])}`;
        return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "ធាតុ"}`;
        return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${_issue.pattern}`;
        return `មិនត្រឹមត្រូវ៖ ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${issue2.divisor}`;
      case "unrecognized_keys":
        return `រកឃើញសោមិនស្គាល់៖ ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `សោមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      case "invalid_union":
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
      case "invalid_element":
        return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      default:
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
    }
  };
};
function km_default() {
  return {
    localeError: error23()
  };
}

// node_modules/zod/v4/locales/kh.js
function kh_default() {
  return km_default();
}
// node_modules/zod/v4/locales/ko.js
var error24 = () => {
  const Sizable = {
    string: { unit: "문자", verb: "to have" },
    file: { unit: "바이트", verb: "to have" },
    array: { unit: "개", verb: "to have" },
    set: { unit: "개", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "입력",
    email: "이메일 주소",
    url: "URL",
    emoji: "이모지",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 날짜시간",
    date: "ISO 날짜",
    time: "ISO 시간",
    duration: "ISO 기간",
    ipv4: "IPv4 주소",
    ipv6: "IPv6 주소",
    cidrv4: "IPv4 범위",
    cidrv6: "IPv6 범위",
    base64: "base64 인코딩 문자열",
    base64url: "base64url 인코딩 문자열",
    json_string: "JSON 문자열",
    e164: "E.164 번호",
    jwt: "JWT",
    template_literal: "입력"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `잘못된 입력: 예상 타입은 ${issue2.expected}, 받은 타입은 ${parsedType6(issue2.input)}입니다`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `잘못된 입력: 값은 ${stringifyPrimitive(issue2.values[0])} 이어야 합니다`;
        return `잘못된 옵션: ${joinValues(issue2.values, "또는 ")} 중 하나여야 합니다`;
      case "too_big": {
        const adj = issue2.inclusive ? "이하" : "미만";
        const suffix = adj === "미만" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing)
          return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
        return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()} ${adj}${suffix}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "이상" : "초과";
        const suffix = adj === "이상" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing) {
          return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
        }
        return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()} ${adj}${suffix}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `잘못된 문자열: "${_issue.prefix}"(으)로 시작해야 합니다`;
        }
        if (_issue.format === "ends_with")
          return `잘못된 문자열: "${_issue.suffix}"(으)로 끝나야 합니다`;
        if (_issue.format === "includes")
          return `잘못된 문자열: "${_issue.includes}"을(를) 포함해야 합니다`;
        if (_issue.format === "regex")
          return `잘못된 문자열: 정규식 ${_issue.pattern} 패턴과 일치해야 합니다`;
        return `잘못된 ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `잘못된 숫자: ${issue2.divisor}의 배수여야 합니다`;
      case "unrecognized_keys":
        return `인식할 수 없는 키: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `잘못된 키: ${issue2.origin}`;
      case "invalid_union":
        return `잘못된 입력`;
      case "invalid_element":
        return `잘못된 값: ${issue2.origin}`;
      default:
        return `잘못된 입력`;
    }
  };
};
function ko_default() {
  return {
    localeError: error24()
  };
}
// node_modules/zod/v4/locales/lt.js
var parsedType6 = (data) => {
  const t = typeof data;
  return parsedTypeFromType(t, data);
};
var parsedTypeFromType = (t, data = undefined) => {
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "skaičius";
    }
    case "bigint": {
      return "sveikasis skaičius";
    }
    case "string": {
      return "eilutė";
    }
    case "boolean": {
      return "loginė reikšmė";
    }
    case "undefined":
    case "void": {
      return "neapibrėžta reikšmė";
    }
    case "function": {
      return "funkcija";
    }
    case "symbol": {
      return "simbolis";
    }
    case "object": {
      if (data === undefined)
        return "nežinomas objektas";
      if (data === null)
        return "nulinė reikšmė";
      if (Array.isArray(data))
        return "masyvas";
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
      return "objektas";
    }
    case "null": {
      return "nulinė reikšmė";
    }
  }
  return t;
};
var capitalizeFirstCharacter = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};
function getUnitTypeFromNumber(number2) {
  const abs = Math.abs(number2);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last2 >= 11 && last2 <= 19 || last === 0)
    return "many";
  if (last === 1)
    return "one";
  return "few";
}
var error25 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "simbolis",
        few: "simboliai",
        many: "simbolių"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne ilgesnė kaip",
          notInclusive: "turi būti trumpesnė kaip"
        },
        bigger: {
          inclusive: "turi būti ne trumpesnė kaip",
          notInclusive: "turi būti ilgesnė kaip"
        }
      }
    },
    file: {
      unit: {
        one: "baitas",
        few: "baitai",
        many: "baitų"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne didesnis kaip",
          notInclusive: "turi būti mažesnis kaip"
        },
        bigger: {
          inclusive: "turi būti ne mažesnis kaip",
          notInclusive: "turi būti didesnis kaip"
        }
      }
    },
    array: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    },
    set: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    }
  };
  function getSizing(origin, unitType, inclusive, targetShouldBe) {
    const result = Sizable[origin] ?? null;
    if (result === null)
      return result;
    return {
      unit: result.unit[unitType],
      verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
    };
  }
  const Nouns = {
    regex: "įvestis",
    email: "el. pašto adresas",
    url: "URL",
    emoji: "jaustukas",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO data ir laikas",
    date: "ISO data",
    time: "ISO laikas",
    duration: "ISO trukmė",
    ipv4: "IPv4 adresas",
    ipv6: "IPv6 adresas",
    cidrv4: "IPv4 tinklo prefiksas (CIDR)",
    cidrv6: "IPv6 tinklo prefiksas (CIDR)",
    base64: "base64 užkoduota eilutė",
    base64url: "base64url užkoduota eilutė",
    json_string: "JSON eilutė",
    e164: "E.164 numeris",
    jwt: "JWT",
    template_literal: "įvestis"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Gautas tipas ${parsedType6(issue2.input)}, o tikėtasi - ${parsedTypeFromType(issue2.expected)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Privalo būti ${stringifyPrimitive(issue2.values[0])}`;
        return `Privalo būti vienas iš ${joinValues(issue2.values, "|")} pasirinkimų`;
      case "too_big": {
        const origin = parsedTypeFromType(issue2.origin);
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), issue2.inclusive ?? false, "smaller");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.maximum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne didesnis kaip" : "mažesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.maximum.toString()} ${sizing?.unit}`;
      }
      case "too_small": {
        const origin = parsedTypeFromType(issue2.origin);
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), issue2.inclusive ?? false, "bigger");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.minimum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne mažesnis kaip" : "didesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.minimum.toString()} ${sizing?.unit}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Eilutė privalo prasidėti "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Eilutė privalo pasibaigti "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Eilutė privalo įtraukti "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Eilutė privalo atitikti ${_issue.pattern}`;
        return `Neteisingas ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Skaičius privalo būti ${issue2.divisor} kartotinis.`;
      case "unrecognized_keys":
        return `Neatpažint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Rastas klaidingas raktas";
      case "invalid_union":
        return "Klaidinga įvestis";
      case "invalid_element": {
        const origin = parsedTypeFromType(issue2.origin);
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi klaidingą įvestį`;
      }
      default:
        return "Klaidinga įvestis";
    }
  };
};
function lt_default() {
  return {
    localeError: error25()
  };
}
// node_modules/zod/v4/locales/mk.js
var error26 = () => {
  const Sizable = {
    string: { unit: "знаци", verb: "да имаат" },
    file: { unit: "бајти", verb: "да имаат" },
    array: { unit: "ставки", verb: "да имаат" },
    set: { unit: "ставки", verb: "да имаат" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "број";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "низа";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "внес",
    email: "адреса на е-пошта",
    url: "URL",
    emoji: "емоџи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO датум и време",
    date: "ISO датум",
    time: "ISO време",
    duration: "ISO времетраење",
    ipv4: "IPv4 адреса",
    ipv6: "IPv6 адреса",
    cidrv4: "IPv4 опсег",
    cidrv6: "IPv6 опсег",
    base64: "base64-енкодирана низа",
    base64url: "base64url-енкодирана низа",
    json_string: "JSON низа",
    e164: "E.164 број",
    jwt: "JWT",
    template_literal: "внес"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Грешен внес: се очекува ${issue2.expected}, примено ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Грешана опција: се очекува една ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да има ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементи"}`;
        return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да биде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Премногу мал: се очекува ${issue2.origin} да има ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Премногу мал: се очекува ${issue2.origin} да биде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Неважечка низа: мора да започнува со "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Неважечка низа: мора да завршува со "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неважечка низа: мора да вклучува "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неважечка низа: мора да одгоара на патернот ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Грешен број: мора да биде делив со ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Непрепознаени клучеви" : "Непрепознаен клуч"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Грешен клуч во ${issue2.origin}`;
      case "invalid_union":
        return "Грешен внес";
      case "invalid_element":
        return `Грешна вредност во ${issue2.origin}`;
      default:
        return `Грешен внес`;
    }
  };
};
function mk_default() {
  return {
    localeError: error26()
  };
}
// node_modules/zod/v4/locales/ms.js
var error27 = () => {
  const Sizable = {
    string: { unit: "aksara", verb: "mempunyai" },
    file: { unit: "bait", verb: "mempunyai" },
    array: { unit: "elemen", verb: "mempunyai" },
    set: { unit: "elemen", verb: "mempunyai" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nombor";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "alamat e-mel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tarikh masa ISO",
    date: "tarikh ISO",
    time: "masa ISO",
    duration: "tempoh ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "julat IPv4",
    cidrv6: "julat IPv6",
    base64: "string dikodkan base64",
    base64url: "string dikodkan base64url",
    json_string: "string JSON",
    e164: "nombor E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Input tidak sah: dijangka ${issue2.expected}, diterima ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} tidak sah`;
      }
      case "not_multiple_of":
        return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak sah dalam ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak sah";
      case "invalid_element":
        return `Nilai tidak sah dalam ${issue2.origin}`;
      default:
        return `Input tidak sah`;
    }
  };
};
function ms_default() {
  return {
    localeError: error27()
  };
}
// node_modules/zod/v4/locales/nl.js
var error28 = () => {
  const Sizable = {
    string: { unit: "tekens", verb: "te hebben" },
    file: { unit: "bytes", verb: "te hebben" },
    array: { unit: "elementen", verb: "te hebben" },
    set: { unit: "elementen", verb: "te hebben" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "getal";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "invoer",
    email: "emailadres",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum en tijd",
    date: "ISO datum",
    time: "ISO tijd",
    duration: "ISO duur",
    ipv4: "IPv4-adres",
    ipv6: "IPv6-adres",
    cidrv4: "IPv4-bereik",
    cidrv6: "IPv6-bereik",
    base64: "base64-gecodeerde tekst",
    base64url: "base64 URL-gecodeerde tekst",
    json_string: "JSON string",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "invoer"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ongeldige invoer: verwacht ${issue2.expected}, ontving ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
        return `Ongeldige optie: verwacht één van ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Te groot: verwacht dat ${issue2.origin ?? "waarde"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementen"}`;
        return `Te groot: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} is`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Te klein: verwacht dat ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Te klein: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
        }
        if (_issue.format === "ends_with")
          return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
        if (_issue.format === "includes")
          return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
        if (_issue.format === "regex")
          return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
        return `Ongeldig: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
      case "unrecognized_keys":
        return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ongeldige key in ${issue2.origin}`;
      case "invalid_union":
        return "Ongeldige invoer";
      case "invalid_element":
        return `Ongeldige waarde in ${issue2.origin}`;
      default:
        return `Ongeldige invoer`;
    }
  };
};
function nl_default() {
  return {
    localeError: error28()
  };
}
// node_modules/zod/v4/locales/no.js
var error29 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "å ha" },
    file: { unit: "bytes", verb: "å ha" },
    array: { unit: "elementer", verb: "å inneholde" },
    set: { unit: "elementer", verb: "å inneholde" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "tall";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "liste";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "e-postadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslett",
    date: "ISO-dato",
    time: "ISO-klokkeslett",
    duration: "ISO-varighet",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spekter",
    cidrv6: "IPv6-spekter",
    base64: "base64-enkodet streng",
    base64url: "base64url-enkodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ugyldig input: forventet ${issue2.expected}, fikk ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: må starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: må ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: må inneholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: må matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldig tall: må være et multiplum av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukjente nøkler" : "Ukjent nøkkel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøkkel i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldig input";
      case "invalid_element":
        return `Ugyldig verdi i ${issue2.origin}`;
      default:
        return `Ugyldig input`;
    }
  };
};
function no_default() {
  return {
    localeError: error29()
  };
}
// node_modules/zod/v4/locales/ota.js
var error30 = () => {
  const Sizable = {
    string: { unit: "harf", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "unsur", verb: "olmalıdır" },
    set: { unit: "unsur", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "numara";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "saf";
        }
        if (data === null) {
          return "gayb";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "giren",
    email: "epostagâh",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO hengâmı",
    date: "ISO tarihi",
    time: "ISO zamanı",
    duration: "ISO müddeti",
    ipv4: "IPv4 nişânı",
    ipv6: "IPv6 nişânı",
    cidrv4: "IPv4 menzili",
    cidrv6: "IPv6 menzili",
    base64: "base64-şifreli metin",
    base64url: "base64url-şifreli metin",
    json_string: "JSON metin",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "giren"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Fâsit giren: umulan ${issue2.expected}, alınan ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Fâsit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
        return `Fâsit tercih: mûteberler ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmalıydı.`;
        return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} olmalıydı.`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmalıydı.`;
        }
        return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmalıydı.`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Fâsit metin: "${_issue.prefix}" ile başlamalı.`;
        if (_issue.format === "ends_with")
          return `Fâsit metin: "${_issue.suffix}" ile bitmeli.`;
        if (_issue.format === "includes")
          return `Fâsit metin: "${_issue.includes}" ihtivâ etmeli.`;
        if (_issue.format === "regex")
          return `Fâsit metin: ${_issue.pattern} nakşına uymalı.`;
        return `Fâsit ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Fâsit sayı: ${issue2.divisor} katı olmalıydı.`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} için tanınmayan anahtar var.`;
      case "invalid_union":
        return "Giren tanınamadı.";
      case "invalid_element":
        return `${issue2.origin} için tanınmayan kıymet var.`;
      default:
        return `Kıymet tanınamadı.`;
    }
  };
};
function ota_default() {
  return {
    localeError: error30()
  };
}
// node_modules/zod/v4/locales/ps.js
var error31 = () => {
  const Sizable = {
    string: { unit: "توکي", verb: "ولري" },
    file: { unit: "بایټس", verb: "ولري" },
    array: { unit: "توکي", verb: "ولري" },
    set: { unit: "توکي", verb: "ولري" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "عدد";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "ارې";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ورودي",
    email: "بریښنالیک",
    url: "یو آر ال",
    emoji: "ایموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "نیټه او وخت",
    date: "نېټه",
    time: "وخت",
    duration: "موده",
    ipv4: "د IPv4 پته",
    ipv6: "د IPv6 پته",
    cidrv4: "د IPv4 ساحه",
    cidrv6: "د IPv6 ساحه",
    base64: "base64-encoded متن",
    base64url: "base64url-encoded متن",
    json_string: "JSON متن",
    e164: "د E.164 شمېره",
    jwt: "JWT",
    template_literal: "ورودي"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ناسم ورودي: باید ${issue2.expected} وای, مګر ${parsedType7(issue2.input)} ترلاسه شو`;
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ناسم ورودي: باید ${stringifyPrimitive(issue2.values[0])} وای`;
        }
        return `ناسم انتخاب: باید یو له ${joinValues(issue2.values, "|")} څخه وای`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصرونه"} ولري`;
        }
        return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} وي`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} ولري`;
        }
        return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} وي`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ناسم متن: باید د "${_issue.prefix}" سره پیل شي`;
        }
        if (_issue.format === "ends_with") {
          return `ناسم متن: باید د "${_issue.suffix}" سره پای ته ورسيږي`;
        }
        if (_issue.format === "includes") {
          return `ناسم متن: باید "${_issue.includes}" ولري`;
        }
        if (_issue.format === "regex") {
          return `ناسم متن: باید د ${_issue.pattern} سره مطابقت ولري`;
        }
        return `${Nouns[_issue.format] ?? issue2.format} ناسم دی`;
      }
      case "not_multiple_of":
        return `ناسم عدد: باید د ${issue2.divisor} مضرب وي`;
      case "unrecognized_keys":
        return `ناسم ${issue2.keys.length > 1 ? "کلیډونه" : "کلیډ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `ناسم کلیډ په ${issue2.origin} کې`;
      case "invalid_union":
        return `ناسمه ورودي`;
      case "invalid_element":
        return `ناسم عنصر په ${issue2.origin} کې`;
      default:
        return `ناسمه ورودي`;
    }
  };
};
function ps_default() {
  return {
    localeError: error31()
  };
}
// node_modules/zod/v4/locales/pl.js
var error32 = () => {
  const Sizable = {
    string: { unit: "znaków", verb: "mieć" },
    file: { unit: "bajtów", verb: "mieć" },
    array: { unit: "elementów", verb: "mieć" },
    set: { unit: "elementów", verb: "mieć" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "liczba";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tablica";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "wyrażenie",
    email: "adres email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i godzina w formacie ISO",
    date: "data w formacie ISO",
    time: "godzina w formacie ISO",
    duration: "czas trwania ISO",
    ipv4: "adres IPv4",
    ipv6: "adres IPv6",
    cidrv4: "zakres IPv4",
    cidrv6: "zakres IPv6",
    base64: "ciąg znaków zakodowany w formacie base64",
    base64url: "ciąg znaków zakodowany w formacie base64url",
    json_string: "ciąg znaków w formacie JSON",
    e164: "liczba E.164",
    jwt: "JWT",
    template_literal: "wejście"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Nieprawidłowe dane wejściowe: oczekiwano ${issue2.expected}, otrzymano ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nieprawidłowe dane wejściowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
        return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za duża wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt duż(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za mała wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt mał(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${_issue.pattern}`;
        return `Nieprawidłow(y/a/e) ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nieprawidłowa liczba: musi być wielokrotnością ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nieprawidłowy klucz w ${issue2.origin}`;
      case "invalid_union":
        return "Nieprawidłowe dane wejściowe";
      case "invalid_element":
        return `Nieprawidłowa wartość w ${issue2.origin}`;
      default:
        return `Nieprawidłowe dane wejściowe`;
    }
  };
};
function pl_default() {
  return {
    localeError: error32()
  };
}
// node_modules/zod/v4/locales/pt.js
var error33 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "ter" },
    file: { unit: "bytes", verb: "ter" },
    array: { unit: "itens", verb: "ter" },
    set: { unit: "itens", verb: "ter" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "número";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "nulo";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "padrão",
    email: "endereço de e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "duração ISO",
    ipv4: "endereço IPv4",
    ipv6: "endereço IPv6",
    cidrv4: "faixa de IPv4",
    cidrv6: "faixa de IPv6",
    base64: "texto codificado em base64",
    base64url: "URL codificada em base64",
    json_string: "texto JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Tipo inválido: esperado ${issue2.expected}, recebido ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: esperado ${stringifyPrimitive(issue2.values[0])}`;
        return `Opção inválida: esperada uma das ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Muito grande: esperado que ${issue2.origin ?? "valor"} tivesse ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Muito grande: esperado que ${issue2.origin ?? "valor"} fosse ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Texto inválido: deve começar com "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Texto inválido: deve terminar com "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Texto inválido: deve incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Texto inválido: deve corresponder ao padrão ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} inválido`;
      }
      case "not_multiple_of":
        return `Número inválido: deve ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chave inválida em ${issue2.origin}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido em ${issue2.origin}`;
      default:
        return `Campo inválido`;
    }
  };
};
function pt_default() {
  return {
    localeError: error33()
  };
}
// node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
var error34 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "символ",
        few: "символа",
        many: "символов"
      },
      verb: "иметь"
    },
    file: {
      unit: {
        one: "байт",
        few: "байта",
        many: "байт"
      },
      verb: "иметь"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "число";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "массив";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ввод",
    email: "email адрес",
    url: "URL",
    emoji: "эмодзи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата и время",
    date: "ISO дата",
    time: "ISO время",
    duration: "ISO длительность",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "строка в формате base64",
    base64url: "строка в формате base64url",
    json_string: "JSON строка",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "ввод"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Неверный ввод: ожидалось ${issue2.expected}, получено ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неверный ввод: ожидалось ${stringifyPrimitive(issue2.values[0])}`;
        return `Неверный вариант: ожидалось одно из ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет иметь ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет иметь ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неверная строка: должна начинаться с "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неверная строка: должна заканчиваться на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неверная строка: должна содержать "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неверная строка: должна соответствовать шаблону ${_issue.pattern}`;
        return `Неверный ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неверное число: должно быть кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспознанн${issue2.keys.length > 1 ? "ые" : "ый"} ключ${issue2.keys.length > 1 ? "и" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неверный ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Неверные входные данные";
      case "invalid_element":
        return `Неверное значение в ${issue2.origin}`;
      default:
        return `Неверные входные данные`;
    }
  };
};
function ru_default() {
  return {
    localeError: error34()
  };
}
// node_modules/zod/v4/locales/sl.js
var error35 = () => {
  const Sizable = {
    string: { unit: "znakov", verb: "imeti" },
    file: { unit: "bajtov", verb: "imeti" },
    array: { unit: "elementov", verb: "imeti" },
    set: { unit: "elementov", verb: "imeti" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "število";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tabela";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "vnos",
    email: "e-poštni naslov",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum in čas",
    date: "ISO datum",
    time: "ISO čas",
    duration: "ISO trajanje",
    ipv4: "IPv4 naslov",
    ipv6: "IPv6 naslov",
    cidrv4: "obseg IPv4",
    cidrv6: "obseg IPv6",
    base64: "base64 kodiran niz",
    base64url: "base64url kodiran niz",
    json_string: "JSON niz",
    e164: "E.164 številka",
    jwt: "JWT",
    template_literal: "vnos"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Neveljaven vnos: pričakovano ${issue2.expected}, prejeto ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neveljaven vnos: pričakovano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neveljavna možnost: pričakovano eno izmed ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementov"}`;
        return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Premajhno: pričakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premajhno: pričakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Neveljaven niz: mora se začeti z "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Neveljaven niz: mora se končati z "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
        return `Neveljaven ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neveljavno število: mora biti večkratnik ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznan${issue2.keys.length > 1 ? "i ključi" : " ključ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neveljaven ključ v ${issue2.origin}`;
      case "invalid_union":
        return "Neveljaven vnos";
      case "invalid_element":
        return `Neveljavna vrednost v ${issue2.origin}`;
      default:
        return "Neveljaven vnos";
    }
  };
};
function sl_default() {
  return {
    localeError: error35()
  };
}
// node_modules/zod/v4/locales/sv.js
var error36 = () => {
  const Sizable = {
    string: { unit: "tecken", verb: "att ha" },
    file: { unit: "bytes", verb: "att ha" },
    array: { unit: "objekt", verb: "att innehålla" },
    set: { unit: "objekt", verb: "att innehålla" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "antal";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "lista";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "reguljärt uttryck",
    email: "e-postadress",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datum och tid",
    date: "ISO-datum",
    time: "ISO-tid",
    duration: "ISO-varaktighet",
    ipv4: "IPv4-intervall",
    ipv6: "IPv6-intervall",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodad sträng",
    base64url: "base64url-kodad sträng",
    json_string: "JSON-sträng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "mall-literal"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ogiltig inmatning: förväntat ${issue2.expected}, fick ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ogiltig inmatning: förväntat ${stringifyPrimitive(issue2.values[0])}`;
        return `Ogiltigt val: förväntade en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För stor(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        }
        return `För stor(t): förväntat ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ogiltig sträng: måste börja med "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ogiltig sträng: måste sluta med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ogiltig sträng: måste innehålla "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ogiltig sträng: måste matcha mönstret "${_issue.pattern}"`;
        return `Ogiltig(t) ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ogiltigt tal: måste vara en multipel av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Okända nycklar" : "Okänd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ogiltig nyckel i ${issue2.origin ?? "värdet"}`;
      case "invalid_union":
        return "Ogiltig input";
      case "invalid_element":
        return `Ogiltigt värde i ${issue2.origin ?? "värdet"}`;
      default:
        return `Ogiltig input`;
    }
  };
};
function sv_default() {
  return {
    localeError: error36()
  };
}
// node_modules/zod/v4/locales/ta.js
var error37 = () => {
  const Sizable = {
    string: { unit: "எழுத்துக்கள்", verb: "கொண்டிருக்க வேண்டும்" },
    file: { unit: "பைட்டுகள்", verb: "கொண்டிருக்க வேண்டும்" },
    array: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" },
    set: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "எண் அல்லாதது" : "எண்";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "அணி";
        }
        if (data === null) {
          return "வெறுமை";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "உள்ளீடு",
    email: "மின்னஞ்சல் முகவரி",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO தேதி நேரம்",
    date: "ISO தேதி",
    time: "ISO நேரம்",
    duration: "ISO கால அளவு",
    ipv4: "IPv4 முகவரி",
    ipv6: "IPv6 முகவரி",
    cidrv4: "IPv4 வரம்பு",
    cidrv6: "IPv6 வரம்பு",
    base64: "base64-encoded சரம்",
    base64url: "base64url-encoded சரம்",
    json_string: "JSON சரம்",
    e164: "E.164 எண்",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${issue2.expected}, பெறப்பட்டது ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${stringifyPrimitive(issue2.values[0])}`;
        return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${joinValues(issue2.values, "|")} இல் ஒன்று`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "உறுப்புகள்"} ஆக இருக்க வேண்டும்`;
        }
        return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ஆக இருக்க வேண்டும்`;
        }
        return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `தவறான சரம்: "${_issue.prefix}" இல் தொடங்க வேண்டும்`;
        if (_issue.format === "ends_with")
          return `தவறான சரம்: "${_issue.suffix}" இல் முடிவடைய வேண்டும்`;
        if (_issue.format === "includes")
          return `தவறான சரம்: "${_issue.includes}" ஐ உள்ளடக்க வேண்டும்`;
        if (_issue.format === "regex")
          return `தவறான சரம்: ${_issue.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
        return `தவறான ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `தவறான எண்: ${issue2.divisor} இன் பலமாக இருக்க வேண்டும்`;
      case "unrecognized_keys":
        return `அடையாளம் தெரியாத விசை${issue2.keys.length > 1 ? "கள்" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} இல் தவறான விசை`;
      case "invalid_union":
        return "தவறான உள்ளீடு";
      case "invalid_element":
        return `${issue2.origin} இல் தவறான மதிப்பு`;
      default:
        return `தவறான உள்ளீடு`;
    }
  };
};
function ta_default() {
  return {
    localeError: error37()
  };
}
// node_modules/zod/v4/locales/th.js
var error38 = () => {
  const Sizable = {
    string: { unit: "ตัวอักษร", verb: "ควรมี" },
    file: { unit: "ไบต์", verb: "ควรมี" },
    array: { unit: "รายการ", verb: "ควรมี" },
    set: { unit: "รายการ", verb: "ควรมี" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "ไม่ใช่ตัวเลข (NaN)" : "ตัวเลข";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "อาร์เรย์ (Array)";
        }
        if (data === null) {
          return "ไม่มีค่า (null)";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ข้อมูลที่ป้อน",
    email: "ที่อยู่อีเมล",
    url: "URL",
    emoji: "อิโมจิ",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "วันที่เวลาแบบ ISO",
    date: "วันที่แบบ ISO",
    time: "เวลาแบบ ISO",
    duration: "ช่วงเวลาแบบ ISO",
    ipv4: "ที่อยู่ IPv4",
    ipv6: "ที่อยู่ IPv6",
    cidrv4: "ช่วง IP แบบ IPv4",
    cidrv6: "ช่วง IP แบบ IPv6",
    base64: "ข้อความแบบ Base64",
    base64url: "ข้อความแบบ Base64 สำหรับ URL",
    json_string: "ข้อความแบบ JSON",
    e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
    jwt: "โทเคน JWT",
    template_literal: "ข้อมูลที่ป้อน"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${issue2.expected} แต่ได้รับ ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ค่าไม่ถูกต้อง: ควรเป็น ${stringifyPrimitive(issue2.values[0])}`;
        return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "ไม่เกิน" : "น้อยกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
        return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "อย่างน้อย" : "มากกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อความ`;
        if (_issue.format === "regex")
          return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${_issue.pattern}`;
        return `รูปแบบไม่ถูกต้อง: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${issue2.divisor} ได้ลงตัว`;
      case "unrecognized_keys":
        return `พบคีย์ที่ไม่รู้จัก: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `คีย์ไม่ถูกต้องใน ${issue2.origin}`;
      case "invalid_union":
        return "ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";
      case "invalid_element":
        return `ข้อมูลไม่ถูกต้องใน ${issue2.origin}`;
      default:
        return `ข้อมูลไม่ถูกต้อง`;
    }
  };
};
function th_default() {
  return {
    localeError: error38()
  };
}
// node_modules/zod/v4/locales/tr.js
var parsedType7 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "number";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error39 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "olmalı" },
    file: { unit: "bayt", verb: "olmalı" },
    array: { unit: "öğe", verb: "olmalı" },
    set: { unit: "öğe", verb: "olmalı" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "girdi",
    email: "e-posta adresi",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO tarih ve saat",
    date: "ISO tarih",
    time: "ISO saat",
    duration: "ISO süre",
    ipv4: "IPv4 adresi",
    ipv6: "IPv6 adresi",
    cidrv4: "IPv4 aralığı",
    cidrv6: "IPv6 aralığı",
    base64: "base64 ile şifrelenmiş metin",
    base64url: "base64url ile şifrelenmiş metin",
    json_string: "JSON dizesi",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "Şablon dizesi"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Geçersiz değer: beklenen ${issue2.expected}, alınan ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Geçersiz değer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
        return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "öğe"}`;
        return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Geçersiz metin: "${_issue.prefix}" ile başlamalı`;
        if (_issue.format === "ends_with")
          return `Geçersiz metin: "${_issue.suffix}" ile bitmeli`;
        if (_issue.format === "includes")
          return `Geçersiz metin: "${_issue.includes}" içermeli`;
        if (_issue.format === "regex")
          return `Geçersiz metin: ${_issue.pattern} desenine uymalı`;
        return `Geçersiz ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Geçersiz sayı: ${issue2.divisor} ile tam bölünebilmeli`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} içinde geçersiz anahtar`;
      case "invalid_union":
        return "Geçersiz değer";
      case "invalid_element":
        return `${issue2.origin} içinde geçersiz değer`;
      default:
        return `Geçersiz değer`;
    }
  };
};
function tr_default() {
  return {
    localeError: error39()
  };
}
// node_modules/zod/v4/locales/uk.js
var error40 = () => {
  const Sizable = {
    string: { unit: "символів", verb: "матиме" },
    file: { unit: "байтів", verb: "матиме" },
    array: { unit: "елементів", verb: "матиме" },
    set: { unit: "елементів", verb: "матиме" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType8 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "число";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "масив";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "вхідні дані",
    email: "адреса електронної пошти",
    url: "URL",
    emoji: "емодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "дата та час ISO",
    date: "дата ISO",
    time: "час ISO",
    duration: "тривалість ISO",
    ipv4: "адреса IPv4",
    ipv6: "адреса IPv6",
    cidrv4: "діапазон IPv4",
    cidrv6: "діапазон IPv6",
    base64: "рядок у кодуванні base64",
    base64url: "рядок у кодуванні base64url",
    json_string: "рядок JSON",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "вхідні дані"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Неправильні вхідні дані: очікується ${issue2.expected}, отримано ${parsedType8(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неправильні вхідні дані: очікується ${stringifyPrimitive(issue2.values[0])}`;
        return `Неправильна опція: очікується одне з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементів"}`;
        return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} буде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Занадто мале: очікується, що ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Занадто мале: очікується, що ${issue2.origin} буде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неправильний рядок: повинен починатися з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неправильний рядок: повинен закінчуватися на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неправильний рядок: повинен містити "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неправильний рядок: повинен відповідати шаблону ${_issue.pattern}`;
        return `Неправильний ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неправильне число: повинно бути кратним ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нерозпізнаний ключ${issue2.keys.length > 1 ? "і" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неправильний ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Неправильні вхідні дані";
      case "invalid_element":
        return `Неправильне значення у ${issue2.origin}`;
      default:
        return `Неправильні вхідні дані`;
    }
  };
};
function uk_default() {
  return {
    localeError: error40()
  };
}

// node_modules/zod/v4/locales/ua.js
function ua_default() {
  return uk_default();
}
// node_modules/zod/v4/locales/ur.js
var error41 = () => {
  const Sizable = {
    string: { unit: "حروف", verb: "ہونا" },
    file: { unit: "بائٹس", verb: "ہونا" },
    array: { unit: "آئٹمز", verb: "ہونا" },
    set: { unit: "آئٹمز", verb: "ہونا" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType8 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "نمبر";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "آرے";
        }
        if (data === null) {
          return "نل";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ان پٹ",
    email: "ای میل ایڈریس",
    url: "یو آر ایل",
    emoji: "ایموجی",
    uuid: "یو یو آئی ڈی",
    uuidv4: "یو یو آئی ڈی وی 4",
    uuidv6: "یو یو آئی ڈی وی 6",
    nanoid: "نینو آئی ڈی",
    guid: "جی یو آئی ڈی",
    cuid: "سی یو آئی ڈی",
    cuid2: "سی یو آئی ڈی 2",
    ulid: "یو ایل آئی ڈی",
    xid: "ایکس آئی ڈی",
    ksuid: "کے ایس یو آئی ڈی",
    datetime: "آئی ایس او ڈیٹ ٹائم",
    date: "آئی ایس او تاریخ",
    time: "آئی ایس او وقت",
    duration: "آئی ایس او مدت",
    ipv4: "آئی پی وی 4 ایڈریس",
    ipv6: "آئی پی وی 6 ایڈریس",
    cidrv4: "آئی پی وی 4 رینج",
    cidrv6: "آئی پی وی 6 رینج",
    base64: "بیس 64 ان کوڈڈ سٹرنگ",
    base64url: "بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",
    json_string: "جے ایس او این سٹرنگ",
    e164: "ای 164 نمبر",
    jwt: "جے ڈبلیو ٹی",
    template_literal: "ان پٹ"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `غلط ان پٹ: ${issue2.expected} متوقع تھا، ${parsedType8(issue2.input)} موصول ہوا`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `غلط ان پٹ: ${stringifyPrimitive(issue2.values[0])} متوقع تھا`;
        return `غلط آپشن: ${joinValues(issue2.values, "|")} میں سے ایک متوقع تھا`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کے ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عناصر"} ہونے متوقع تھے`;
        return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کا ${adj}${issue2.maximum.toString()} ہونا متوقع تھا`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `بہت چھوٹا: ${issue2.origin} کے ${adj}${issue2.minimum.toString()} ${sizing.unit} ہونے متوقع تھے`;
        }
        return `بہت چھوٹا: ${issue2.origin} کا ${adj}${issue2.minimum.toString()} ہونا متوقع تھا`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `غلط سٹرنگ: "${_issue.prefix}" سے شروع ہونا چاہیے`;
        }
        if (_issue.format === "ends_with")
          return `غلط سٹرنگ: "${_issue.suffix}" پر ختم ہونا چاہیے`;
        if (_issue.format === "includes")
          return `غلط سٹرنگ: "${_issue.includes}" شامل ہونا چاہیے`;
        if (_issue.format === "regex")
          return `غلط سٹرنگ: پیٹرن ${_issue.pattern} سے میچ ہونا چاہیے`;
        return `غلط ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `غلط نمبر: ${issue2.divisor} کا مضاعف ہونا چاہیے`;
      case "unrecognized_keys":
        return `غیر تسلیم شدہ کی${issue2.keys.length > 1 ? "ز" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `${issue2.origin} میں غلط کی`;
      case "invalid_union":
        return "غلط ان پٹ";
      case "invalid_element":
        return `${issue2.origin} میں غلط ویلیو`;
      default:
        return `غلط ان پٹ`;
    }
  };
};
function ur_default() {
  return {
    localeError: error41()
  };
}
// node_modules/zod/v4/locales/vi.js
var error42 = () => {
  const Sizable = {
    string: { unit: "ký tự", verb: "có" },
    file: { unit: "byte", verb: "có" },
    array: { unit: "phần tử", verb: "có" },
    set: { unit: "phần tử", verb: "có" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType8 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "số";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "mảng";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "đầu vào",
    email: "địa chỉ email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ngày giờ ISO",
    date: "ngày ISO",
    time: "giờ ISO",
    duration: "khoảng thời gian ISO",
    ipv4: "địa chỉ IPv4",
    ipv6: "địa chỉ IPv6",
    cidrv4: "dải IPv4",
    cidrv6: "dải IPv6",
    base64: "chuỗi mã hóa base64",
    base64url: "chuỗi mã hóa base64url",
    json_string: "chuỗi JSON",
    e164: "số E.164",
    jwt: "JWT",
    template_literal: "đầu vào"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Đầu vào không hợp lệ: mong đợi ${issue2.expected}, nhận được ${parsedType8(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Đầu vào không hợp lệ: mong đợi ${stringifyPrimitive(issue2.values[0])}`;
        return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "phần tử"}`;
        return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Quá nhỏ: mong đợi ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Quá nhỏ: mong đợi ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chuỗi không hợp lệ: phải bắt đầu bằng "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chuỗi không hợp lệ: phải kết thúc bằng "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chuỗi không hợp lệ: phải bao gồm "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chuỗi không hợp lệ: phải khớp với mẫu ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} không hợp lệ`;
      }
      case "not_multiple_of":
        return `Số không hợp lệ: phải là bội số của ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Khóa không được nhận dạng: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Khóa không hợp lệ trong ${issue2.origin}`;
      case "invalid_union":
        return "Đầu vào không hợp lệ";
      case "invalid_element":
        return `Giá trị không hợp lệ trong ${issue2.origin}`;
      default:
        return `Đầu vào không hợp lệ`;
    }
  };
};
function vi_default() {
  return {
    localeError: error42()
  };
}
// node_modules/zod/v4/locales/zh-CN.js
var error43 = () => {
  const Sizable = {
    string: { unit: "字符", verb: "包含" },
    file: { unit: "字节", verb: "包含" },
    array: { unit: "项", verb: "包含" },
    set: { unit: "项", verb: "包含" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType8 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "非数字(NaN)" : "数字";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "数组";
        }
        if (data === null) {
          return "空值(null)";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "输入",
    email: "电子邮件",
    url: "URL",
    emoji: "表情符号",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日期时间",
    date: "ISO日期",
    time: "ISO时间",
    duration: "ISO时长",
    ipv4: "IPv4地址",
    ipv6: "IPv6地址",
    cidrv4: "IPv4网段",
    cidrv6: "IPv6网段",
    base64: "base64编码字符串",
    base64url: "base64url编码字符串",
    json_string: "JSON字符串",
    e164: "E.164号码",
    jwt: "JWT",
    template_literal: "输入"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `无效输入：期望 ${issue2.expected}，实际接收 ${parsedType8(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `无效输入：期望 ${stringifyPrimitive(issue2.values[0])}`;
        return `无效选项：期望以下之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "个元素"}`;
        return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `无效字符串：必须以 "${_issue.prefix}" 开头`;
        if (_issue.format === "ends_with")
          return `无效字符串：必须以 "${_issue.suffix}" 结尾`;
        if (_issue.format === "includes")
          return `无效字符串：必须包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `无效字符串：必须满足正则表达式 ${_issue.pattern}`;
        return `无效${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `无效数字：必须是 ${issue2.divisor} 的倍数`;
      case "unrecognized_keys":
        return `出现未知的键(key): ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} 中的键(key)无效`;
      case "invalid_union":
        return "无效输入";
      case "invalid_element":
        return `${issue2.origin} 中包含无效值(value)`;
      default:
        return `无效输入`;
    }
  };
};
function zh_CN_default() {
  return {
    localeError: error43()
  };
}
// node_modules/zod/v4/locales/zh-TW.js
var error44 = () => {
  const Sizable = {
    string: { unit: "字元", verb: "擁有" },
    file: { unit: "位元組", verb: "擁有" },
    array: { unit: "項目", verb: "擁有" },
    set: { unit: "項目", verb: "擁有" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType8 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "輸入",
    email: "郵件地址",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 日期時間",
    date: "ISO 日期",
    time: "ISO 時間",
    duration: "ISO 期間",
    ipv4: "IPv4 位址",
    ipv6: "IPv6 位址",
    cidrv4: "IPv4 範圍",
    cidrv6: "IPv6 範圍",
    base64: "base64 編碼字串",
    base64url: "base64url 編碼字串",
    json_string: "JSON 字串",
    e164: "E.164 數值",
    jwt: "JWT",
    template_literal: "輸入"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `無效的輸入值：預期為 ${issue2.expected}，但收到 ${parsedType8(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無效的輸入值：預期為 ${stringifyPrimitive(issue2.values[0])}`;
        return `無效的選項：預期為以下其中之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "個元素"}`;
        return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `無效的字串：必須以 "${_issue.prefix}" 開頭`;
        }
        if (_issue.format === "ends_with")
          return `無效的字串：必須以 "${_issue.suffix}" 結尾`;
        if (_issue.format === "includes")
          return `無效的字串：必須包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `無效的字串：必須符合格式 ${_issue.pattern}`;
        return `無效的 ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無效的數字：必須為 ${issue2.divisor} 的倍數`;
      case "unrecognized_keys":
        return `無法識別的鍵值${issue2.keys.length > 1 ? "們" : ""}：${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin} 中有無效的鍵值`;
      case "invalid_union":
        return "無效的輸入值";
      case "invalid_element":
        return `${issue2.origin} 中有無效的值`;
      default:
        return `無效的輸入值`;
    }
  };
};
function zh_TW_default() {
  return {
    localeError: error44()
  };
}
// node_modules/zod/v4/locales/yo.js
var error45 = () => {
  const Sizable = {
    string: { unit: "àmi", verb: "ní" },
    file: { unit: "bytes", verb: "ní" },
    array: { unit: "nkan", verb: "ní" },
    set: { unit: "nkan", verb: "ní" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType8 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nọ́mbà";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "akopọ";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ẹ̀rọ ìbáwọlé",
    email: "àdírẹ́sì ìmẹ́lì",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "àkókò ISO",
    date: "ọjọ́ ISO",
    time: "àkókò ISO",
    duration: "àkókò tó pé ISO",
    ipv4: "àdírẹ́sì IPv4",
    ipv6: "àdírẹ́sì IPv6",
    cidrv4: "àgbègbè IPv4",
    cidrv6: "àgbègbè IPv6",
    base64: "ọ̀rọ̀ tí a kọ́ ní base64",
    base64url: "ọ̀rọ̀ base64url",
    json_string: "ọ̀rọ̀ JSON",
    e164: "nọ́mbà E.164",
    jwt: "JWT",
    template_literal: "ẹ̀rọ ìbáwọlé"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ìbáwọlé aṣìṣe: a ní láti fi ${issue2.expected}, àmọ̀ a rí ${parsedType8(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${stringifyPrimitive(issue2.values[0])}`;
        return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tó pọ̀ jù: a ní láti jẹ́ pé ${issue2.origin ?? "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
        return `Tó pọ̀ jù: a ní láti jẹ́ ${adj}${issue2.maximum}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Kéré ju: a ní láti jẹ́ pé ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
        return `Kéré ju: a ní láti jẹ́ ${adj}${issue2.minimum}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${_issue.pattern}`;
        return `Aṣìṣe: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Bọtìnì àìmọ̀: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Bọtìnì aṣìṣe nínú ${issue2.origin}`;
      case "invalid_union":
        return "Ìbáwọlé aṣìṣe";
      case "invalid_element":
        return `Iye aṣìṣe nínú ${issue2.origin}`;
      default:
        return "Ìbáwọlé aṣìṣe";
    }
  };
};
function yo_default() {
  return {
    localeError: error45()
  };
}
// node_modules/zod/v4/core/registries.js
var _a;
var $output = Symbol("ZodOutput");
var $input = Symbol("ZodInput");

class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      if (this._idmap.has(meta.id)) {
        throw new Error(`ID ${meta.id} already exists in the registry`);
      }
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
var globalRegistry = globalThis.__zod_globalRegistry;
// node_modules/zod/v4/core/api.js
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _mac(Class2, params) {
  return new Class2({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
var TimePrecision = {
  Any: null,
  Minute: -1,
  Second: 0,
  Millisecond: 3,
  Microsecond: 6
};
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _positive(params) {
  return _gt(0, params);
}
function _negative(params) {
  return _lt(0, params);
}
function _nonpositive(params) {
  return _lte(0, params);
}
function _nonnegative(params) {
  return _gte(0, params);
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _slugify() {
  return _overwrite((input) => slugify(input));
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _union(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function _discriminatedUnion(Class2, discriminator, options, params) {
  return new Class2({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
function _intersection(Class2, left, right) {
  return new Class2({
    type: "intersection",
    left,
    right
  });
}
function _tuple(Class2, items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new Class2({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
function _record(Class2, keyType, valueType, params) {
  return new Class2({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _map(Class2, keyType, valueType, params) {
  return new Class2({
    type: "map",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _set(Class2, valueType, params) {
  return new Class2({
    type: "set",
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(Class2, values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _nativeEnum(Class2, entries, params) {
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _literal(Class2, value, params) {
  return new Class2({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
function _transform(Class2, fn) {
  return new Class2({
    type: "transform",
    transform: fn
  });
}
function _optional(Class2, innerType) {
  return new Class2({
    type: "optional",
    innerType
  });
}
function _nullable(Class2, innerType) {
  return new Class2({
    type: "nullable",
    innerType
  });
}
function _default(Class2, innerType, defaultValue) {
  return new Class2({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function _nonoptional(Class2, innerType, params) {
  return new Class2({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _success(Class2, innerType) {
  return new Class2({
    type: "success",
    innerType
  });
}
function _catch(Class2, innerType, catchValue) {
  return new Class2({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function _pipe(Class2, in_, out) {
  return new Class2({
    type: "pipe",
    in: in_,
    out
  });
}
function _readonly(Class2, innerType) {
  return new Class2({
    type: "readonly",
    innerType
  });
}
function _templateLiteral(Class2, parts, params) {
  return new Class2({
    type: "template_literal",
    parts,
    ...normalizeParams(params)
  });
}
function _lazy(Class2, getter) {
  return new Class2({
    type: "lazy",
    getter
  });
}
function _promise(Class2, innerType) {
  return new Class2({
    type: "promise",
    innerType
  });
}
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function describe(description) {
  const ch = new $ZodCheck({ check: "describe" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, description });
    }
  ];
  ch._zod.check = () => {};
  return ch;
}
function meta(metadata) {
  const ch = new $ZodCheck({ check: "meta" });
  ch._zod.onattach = [
    (inst) => {
      const existing = globalRegistry.get(inst) ?? {};
      globalRegistry.add(inst, { ...existing, ...metadata });
    }
  ];
  ch._zod.check = () => {};
  return ch;
}
function _stringbool(Classes, _params) {
  const params = normalizeParams(_params);
  let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = Classes.Codec ?? $ZodCodec;
  const _Boolean = Classes.Boolean ?? $ZodBoolean;
  const _String = Classes.String ?? $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: (input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec,
          continue: false
        });
        return {};
      }
    },
    reverseTransform: (input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    },
    error: params.error
  });
  return codec;
}
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}
// node_modules/zod/v4/core/to-json-schema.js
class JSONSchemaGenerator {
  constructor(params) {
    this.counter = 0;
    this.metadataRegistry = params?.metadata ?? globalRegistry;
    this.target = params?.target ?? "draft-2020-12";
    this.unrepresentable = params?.unrepresentable ?? "throw";
    this.override = params?.override ?? (() => {});
    this.io = params?.io ?? "output";
    this.seen = new Map;
  }
  process(schema, _params = { path: [], schemaPath: [] }) {
    var _a2;
    const def = schema._zod.def;
    const formatMap = {
      guid: "uuid",
      url: "uri",
      datetime: "date-time",
      json_string: "json-string",
      regex: ""
    };
    const seen = this.seen.get(schema);
    if (seen) {
      seen.count++;
      const isCycle = _params.schemaPath.includes(schema);
      if (isCycle) {
        seen.cycle = _params.path;
      }
      return seen.schema;
    }
    const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
    this.seen.set(schema, result);
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
      result.schema = overrideSchema;
    } else {
      const params = {
        ..._params,
        schemaPath: [..._params.schemaPath, schema],
        path: _params.path
      };
      const parent = schema._zod.parent;
      if (parent) {
        result.ref = parent;
        this.process(parent, params);
        this.seen.get(parent).isParent = true;
      } else {
        const _json = result.schema;
        switch (def.type) {
          case "string": {
            const json = _json;
            json.type = "string";
            const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
            if (typeof minimum === "number")
              json.minLength = minimum;
            if (typeof maximum === "number")
              json.maxLength = maximum;
            if (format) {
              json.format = formatMap[format] ?? format;
              if (json.format === "")
                delete json.format;
            }
            if (contentEncoding)
              json.contentEncoding = contentEncoding;
            if (patterns && patterns.size > 0) {
              const regexes = [...patterns];
              if (regexes.length === 1)
                json.pattern = regexes[0].source;
              else if (regexes.length > 1) {
                result.schema.allOf = [
                  ...regexes.map((regex) => ({
                    ...this.target === "draft-7" || this.target === "draft-4" || this.target === "openapi-3.0" ? { type: "string" } : {},
                    pattern: regex.source
                  }))
                ];
              }
            }
            break;
          }
          case "number": {
            const json = _json;
            const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
            if (typeof format === "string" && format.includes("int"))
              json.type = "integer";
            else
              json.type = "number";
            if (typeof exclusiveMinimum === "number") {
              if (this.target === "draft-4" || this.target === "openapi-3.0") {
                json.minimum = exclusiveMinimum;
                json.exclusiveMinimum = true;
              } else {
                json.exclusiveMinimum = exclusiveMinimum;
              }
            }
            if (typeof minimum === "number") {
              json.minimum = minimum;
              if (typeof exclusiveMinimum === "number" && this.target !== "draft-4") {
                if (exclusiveMinimum >= minimum)
                  delete json.minimum;
                else
                  delete json.exclusiveMinimum;
              }
            }
            if (typeof exclusiveMaximum === "number") {
              if (this.target === "draft-4" || this.target === "openapi-3.0") {
                json.maximum = exclusiveMaximum;
                json.exclusiveMaximum = true;
              } else {
                json.exclusiveMaximum = exclusiveMaximum;
              }
            }
            if (typeof maximum === "number") {
              json.maximum = maximum;
              if (typeof exclusiveMaximum === "number" && this.target !== "draft-4") {
                if (exclusiveMaximum <= maximum)
                  delete json.maximum;
                else
                  delete json.exclusiveMaximum;
              }
            }
            if (typeof multipleOf === "number")
              json.multipleOf = multipleOf;
            break;
          }
          case "boolean": {
            const json = _json;
            json.type = "boolean";
            break;
          }
          case "bigint": {
            if (this.unrepresentable === "throw") {
              throw new Error("BigInt cannot be represented in JSON Schema");
            }
            break;
          }
          case "symbol": {
            if (this.unrepresentable === "throw") {
              throw new Error("Symbols cannot be represented in JSON Schema");
            }
            break;
          }
          case "null": {
            if (this.target === "openapi-3.0") {
              _json.type = "string";
              _json.nullable = true;
              _json.enum = [null];
            } else
              _json.type = "null";
            break;
          }
          case "any": {
            break;
          }
          case "unknown": {
            break;
          }
          case "undefined": {
            if (this.unrepresentable === "throw") {
              throw new Error("Undefined cannot be represented in JSON Schema");
            }
            break;
          }
          case "void": {
            if (this.unrepresentable === "throw") {
              throw new Error("Void cannot be represented in JSON Schema");
            }
            break;
          }
          case "never": {
            _json.not = {};
            break;
          }
          case "date": {
            if (this.unrepresentable === "throw") {
              throw new Error("Date cannot be represented in JSON Schema");
            }
            break;
          }
          case "array": {
            const json = _json;
            const { minimum, maximum } = schema._zod.bag;
            if (typeof minimum === "number")
              json.minItems = minimum;
            if (typeof maximum === "number")
              json.maxItems = maximum;
            json.type = "array";
            json.items = this.process(def.element, { ...params, path: [...params.path, "items"] });
            break;
          }
          case "object": {
            const json = _json;
            json.type = "object";
            json.properties = {};
            const shape = def.shape;
            for (const key in shape) {
              json.properties[key] = this.process(shape[key], {
                ...params,
                path: [...params.path, "properties", key]
              });
            }
            const allKeys = new Set(Object.keys(shape));
            const requiredKeys = new Set([...allKeys].filter((key) => {
              const v = def.shape[key]._zod;
              if (this.io === "input") {
                return v.optin === undefined;
              } else {
                return v.optout === undefined;
              }
            }));
            if (requiredKeys.size > 0) {
              json.required = Array.from(requiredKeys);
            }
            if (def.catchall?._zod.def.type === "never") {
              json.additionalProperties = false;
            } else if (!def.catchall) {
              if (this.io === "output")
                json.additionalProperties = false;
            } else if (def.catchall) {
              json.additionalProperties = this.process(def.catchall, {
                ...params,
                path: [...params.path, "additionalProperties"]
              });
            }
            break;
          }
          case "union": {
            const json = _json;
            const isDiscriminated = def.discriminator !== undefined;
            const options = def.options.map((x, i) => this.process(x, {
              ...params,
              path: [...params.path, isDiscriminated ? "oneOf" : "anyOf", i]
            }));
            if (isDiscriminated) {
              json.oneOf = options;
            } else {
              json.anyOf = options;
            }
            break;
          }
          case "intersection": {
            const json = _json;
            const a = this.process(def.left, {
              ...params,
              path: [...params.path, "allOf", 0]
            });
            const b = this.process(def.right, {
              ...params,
              path: [...params.path, "allOf", 1]
            });
            const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
            const allOf = [
              ...isSimpleIntersection(a) ? a.allOf : [a],
              ...isSimpleIntersection(b) ? b.allOf : [b]
            ];
            json.allOf = allOf;
            break;
          }
          case "tuple": {
            const json = _json;
            json.type = "array";
            const prefixPath = this.target === "draft-2020-12" ? "prefixItems" : "items";
            const restPath = this.target === "draft-2020-12" ? "items" : this.target === "openapi-3.0" ? "items" : "additionalItems";
            const prefixItems = def.items.map((x, i) => this.process(x, {
              ...params,
              path: [...params.path, prefixPath, i]
            }));
            const rest = def.rest ? this.process(def.rest, {
              ...params,
              path: [...params.path, restPath, ...this.target === "openapi-3.0" ? [def.items.length] : []]
            }) : null;
            if (this.target === "draft-2020-12") {
              json.prefixItems = prefixItems;
              if (rest) {
                json.items = rest;
              }
            } else if (this.target === "openapi-3.0") {
              json.items = {
                anyOf: prefixItems
              };
              if (rest) {
                json.items.anyOf.push(rest);
              }
              json.minItems = prefixItems.length;
              if (!rest) {
                json.maxItems = prefixItems.length;
              }
            } else {
              json.items = prefixItems;
              if (rest) {
                json.additionalItems = rest;
              }
            }
            const { minimum, maximum } = schema._zod.bag;
            if (typeof minimum === "number")
              json.minItems = minimum;
            if (typeof maximum === "number")
              json.maxItems = maximum;
            break;
          }
          case "record": {
            const json = _json;
            json.type = "object";
            if (this.target === "draft-7" || this.target === "draft-2020-12") {
              json.propertyNames = this.process(def.keyType, {
                ...params,
                path: [...params.path, "propertyNames"]
              });
            }
            json.additionalProperties = this.process(def.valueType, {
              ...params,
              path: [...params.path, "additionalProperties"]
            });
            break;
          }
          case "map": {
            if (this.unrepresentable === "throw") {
              throw new Error("Map cannot be represented in JSON Schema");
            }
            break;
          }
          case "set": {
            if (this.unrepresentable === "throw") {
              throw new Error("Set cannot be represented in JSON Schema");
            }
            break;
          }
          case "enum": {
            const json = _json;
            const values = getEnumValues(def.entries);
            if (values.every((v) => typeof v === "number"))
              json.type = "number";
            if (values.every((v) => typeof v === "string"))
              json.type = "string";
            json.enum = values;
            break;
          }
          case "literal": {
            const json = _json;
            const vals = [];
            for (const val of def.values) {
              if (val === undefined) {
                if (this.unrepresentable === "throw") {
                  throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                } else {}
              } else if (typeof val === "bigint") {
                if (this.unrepresentable === "throw") {
                  throw new Error("BigInt literals cannot be represented in JSON Schema");
                } else {
                  vals.push(Number(val));
                }
              } else {
                vals.push(val);
              }
            }
            if (vals.length === 0) {} else if (vals.length === 1) {
              const val = vals[0];
              json.type = val === null ? "null" : typeof val;
              if (this.target === "draft-4" || this.target === "openapi-3.0") {
                json.enum = [val];
              } else {
                json.const = val;
              }
            } else {
              if (vals.every((v) => typeof v === "number"))
                json.type = "number";
              if (vals.every((v) => typeof v === "string"))
                json.type = "string";
              if (vals.every((v) => typeof v === "boolean"))
                json.type = "string";
              if (vals.every((v) => v === null))
                json.type = "null";
              json.enum = vals;
            }
            break;
          }
          case "file": {
            const json = _json;
            const file = {
              type: "string",
              format: "binary",
              contentEncoding: "binary"
            };
            const { minimum, maximum, mime } = schema._zod.bag;
            if (minimum !== undefined)
              file.minLength = minimum;
            if (maximum !== undefined)
              file.maxLength = maximum;
            if (mime) {
              if (mime.length === 1) {
                file.contentMediaType = mime[0];
                Object.assign(json, file);
              } else {
                json.anyOf = mime.map((m) => {
                  const mFile = { ...file, contentMediaType: m };
                  return mFile;
                });
              }
            } else {
              Object.assign(json, file);
            }
            break;
          }
          case "transform": {
            if (this.unrepresentable === "throw") {
              throw new Error("Transforms cannot be represented in JSON Schema");
            }
            break;
          }
          case "nullable": {
            const inner = this.process(def.innerType, params);
            if (this.target === "openapi-3.0") {
              result.ref = def.innerType;
              _json.nullable = true;
            } else {
              _json.anyOf = [inner, { type: "null" }];
            }
            break;
          }
          case "nonoptional": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            break;
          }
          case "success": {
            const json = _json;
            json.type = "boolean";
            break;
          }
          case "default": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            _json.default = JSON.parse(JSON.stringify(def.defaultValue));
            break;
          }
          case "prefault": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            if (this.io === "input")
              _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
            break;
          }
          case "catch": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            let catchValue;
            try {
              catchValue = def.catchValue(undefined);
            } catch {
              throw new Error("Dynamic catch values are not supported in JSON Schema");
            }
            _json.default = catchValue;
            break;
          }
          case "nan": {
            if (this.unrepresentable === "throw") {
              throw new Error("NaN cannot be represented in JSON Schema");
            }
            break;
          }
          case "template_literal": {
            const json = _json;
            const pattern = schema._zod.pattern;
            if (!pattern)
              throw new Error("Pattern not found in template literal");
            json.type = "string";
            json.pattern = pattern.source;
            break;
          }
          case "pipe": {
            const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
            this.process(innerType, params);
            result.ref = innerType;
            break;
          }
          case "readonly": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            _json.readOnly = true;
            break;
          }
          case "promise": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            break;
          }
          case "optional": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            break;
          }
          case "lazy": {
            const innerType = schema._zod.innerType;
            this.process(innerType, params);
            result.ref = innerType;
            break;
          }
          case "custom": {
            if (this.unrepresentable === "throw") {
              throw new Error("Custom types cannot be represented in JSON Schema");
            }
            break;
          }
          case "function": {
            if (this.unrepresentable === "throw") {
              throw new Error("Function types cannot be represented in JSON Schema");
            }
            break;
          }
          default: {}
        }
      }
    }
    const meta2 = this.metadataRegistry.get(schema);
    if (meta2)
      Object.assign(result.schema, meta2);
    if (this.io === "input" && isTransforming(schema)) {
      delete result.schema.examples;
      delete result.schema.default;
    }
    if (this.io === "input" && result.schema._prefault)
      (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
    delete result.schema._prefault;
    const _result = this.seen.get(schema);
    return _result.schema;
  }
  emit(schema, _params) {
    const params = {
      cycles: _params?.cycles ?? "ref",
      reused: _params?.reused ?? "inline",
      external: _params?.external ?? undefined
    };
    const root = this.seen.get(schema);
    if (!root)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const makeURI = (entry) => {
      const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
      if (params.external) {
        const externalId = params.external.registry.get(entry[0])?.id;
        const uriGenerator = params.external.uri ?? ((id2) => id2);
        if (externalId) {
          return { ref: uriGenerator(externalId) };
        }
        const id = entry[1].defId ?? entry[1].schema.id ?? `schema${this.counter++}`;
        entry[1].defId = id;
        return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
      }
      if (entry[1] === root) {
        return { ref: "#" };
      }
      const uriPrefix = `#`;
      const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
      const defId = entry[1].schema.id ?? `__schema${this.counter++}`;
      return { defId, ref: defUriPrefix + defId };
    };
    const extractToDef = (entry) => {
      if (entry[1].schema.$ref) {
        return;
      }
      const seen = entry[1];
      const { ref, defId } = makeURI(entry);
      seen.def = { ...seen.schema };
      if (defId)
        seen.defId = defId;
      const schema2 = seen.schema;
      for (const key in schema2) {
        delete schema2[key];
      }
      schema2.$ref = ref;
    };
    if (params.cycles === "throw") {
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (seen.cycle) {
          throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
        }
      }
    }
    for (const entry of this.seen.entries()) {
      const seen = entry[1];
      if (schema === entry[0]) {
        extractToDef(entry);
        continue;
      }
      if (params.external) {
        const ext = params.external.registry.get(entry[0])?.id;
        if (schema !== entry[0] && ext) {
          extractToDef(entry);
          continue;
        }
      }
      const id = this.metadataRegistry.get(entry[0])?.id;
      if (id) {
        extractToDef(entry);
        continue;
      }
      if (seen.cycle) {
        extractToDef(entry);
        continue;
      }
      if (seen.count > 1) {
        if (params.reused === "ref") {
          extractToDef(entry);
          continue;
        }
      }
    }
    const flattenRef = (zodSchema, params2) => {
      const seen = this.seen.get(zodSchema);
      const schema2 = seen.def ?? seen.schema;
      const _cached = { ...schema2 };
      if (seen.ref === null) {
        return;
      }
      const ref = seen.ref;
      seen.ref = null;
      if (ref) {
        flattenRef(ref, params2);
        const refSchema = this.seen.get(ref).schema;
        if (refSchema.$ref && (params2.target === "draft-7" || params2.target === "draft-4" || params2.target === "openapi-3.0")) {
          schema2.allOf = schema2.allOf ?? [];
          schema2.allOf.push(refSchema);
        } else {
          Object.assign(schema2, refSchema);
          Object.assign(schema2, _cached);
        }
      }
      if (!seen.isParent)
        this.override({
          zodSchema,
          jsonSchema: schema2,
          path: seen.path ?? []
        });
    };
    for (const entry of [...this.seen.entries()].reverse()) {
      flattenRef(entry[0], { target: this.target });
    }
    const result = {};
    if (this.target === "draft-2020-12") {
      result.$schema = "https://json-schema.org/draft/2020-12/schema";
    } else if (this.target === "draft-7") {
      result.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (this.target === "draft-4") {
      result.$schema = "http://json-schema.org/draft-04/schema#";
    } else if (this.target === "openapi-3.0") {} else {
      console.warn(`Invalid target: ${this.target}`);
    }
    if (params.external?.uri) {
      const id = params.external.registry.get(schema)?.id;
      if (!id)
        throw new Error("Schema is missing an `id` property");
      result.$id = params.external.uri(id);
    }
    Object.assign(result, root.def);
    const defs = params.external?.defs ?? {};
    for (const entry of this.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        defs[seen.defId] = seen.def;
      }
    }
    if (params.external) {} else {
      if (Object.keys(defs).length > 0) {
        if (this.target === "draft-2020-12") {
          result.$defs = defs;
        } else {
          result.definitions = defs;
        }
      }
    }
    try {
      return JSON.parse(JSON.stringify(result));
    } catch (_err) {
      throw new Error("Error converting schema to JSON.");
    }
  }
}
function toJSONSchema(input, _params) {
  if (input instanceof $ZodRegistry) {
    const gen2 = new JSONSchemaGenerator(_params);
    const defs = {};
    for (const entry of input._idmap.entries()) {
      const [_, schema] = entry;
      gen2.process(schema);
    }
    const schemas = {};
    const external = {
      registry: input,
      uri: _params?.uri,
      defs
    };
    for (const entry of input._idmap.entries()) {
      const [key, schema] = entry;
      schemas[key] = gen2.emit(schema, {
        ..._params,
        external
      });
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = gen2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const gen = new JSONSchemaGenerator(_params);
  gen.process(input);
  return gen.emit(input, _params);
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
// node_modules/zod/v4/core/json-schema.js
var exports_json_schema = {};
// node_modules/zod/v4/classic/iso.js
var exports_iso = {};
__export(exports_iso, {
  time: () => time2,
  duration: () => duration2,
  datetime: () => datetime2,
  date: () => date2,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate
});
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
};
var ZodError = $constructor("ZodError", initializer2);
var ZodRealError = $constructor("ZodError", initializer2, {
  Parent: Error
});

// node_modules/zod/v4/classic/parse.js
var parse3 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode2 = /* @__PURE__ */ _encode(ZodRealError);
var decode2 = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// node_modules/zod/v4/classic/schemas.js
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks2) => {
    return inst.clone(exports_util.mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...checks2.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }));
  };
  inst.clone = (def2, params) => clone(inst, def2, params);
  inst.brand = () => inst;
  inst.register = (reg, meta2) => {
    reg.add(inst, meta2);
    return inst;
  };
  inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode2(inst, data, params);
  inst.decode = (data, params) => decode2(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
  inst.refine = (check, params) => inst.check(refine(check, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(_overwrite(fn));
  inst.optional = () => optional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default2(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch2(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse(undefined).success;
  inst.isNullable = () => inst.safeParse(null).success;
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  inst.regex = (...args) => inst.check(_regex(...args));
  inst.includes = (...args) => inst.check(_includes(...args));
  inst.startsWith = (...args) => inst.check(_startsWith(...args));
  inst.endsWith = (...args) => inst.check(_endsWith(...args));
  inst.min = (...args) => inst.check(_minLength(...args));
  inst.max = (...args) => inst.check(_maxLength(...args));
  inst.length = (...args) => inst.check(_length(...args));
  inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
  inst.lowercase = (params) => inst.check(_lowercase(params));
  inst.uppercase = (params) => inst.check(_uppercase(params));
  inst.trim = () => inst.check(_trim());
  inst.normalize = (...args) => inst.check(_normalize(...args));
  inst.toLowerCase = () => inst.check(_toLowerCase());
  inst.toUpperCase = () => inst.check(_toUpperCase());
  inst.slugify = () => inst.check(_slugify());
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function email2(params) {
  return _email(ZodEmail, params);
}
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function guid2(params) {
  return _guid(ZodGUID, params);
}
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: /^https?$/,
    hostname: exports_regexes.domain,
    ...exports_util.normalizeParams(params)
  });
}
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ulid2(params) {
  return _ulid(ZodULID, params);
}
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function xid2(params) {
  return _xid(ZodXID, params);
}
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
var ZodMAC = /* @__PURE__ */ $constructor("ZodMAC", (inst, def) => {
  $ZodMAC.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function mac2(params) {
  return _mac(ZodMAC, params);
}
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base642(params) {
  return _base64(ZodBase64, params);
}
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function e1642(params) {
  return _e164(ZodE164, params);
}
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function jwt(params) {
  return _jwt(ZodJWT, params);
}
var ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
  $ZodCustomStringFormat.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", exports_regexes.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", exports_regexes.hex, _params);
}
function hash(alg, params) {
  const enc = params?.enc ?? "hex";
  const format = `${alg}_${enc}`;
  const regex = exports_regexes[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(_gt(0, params));
  inst.nonnegative = (params) => inst.check(_gte(0, params));
  inst.negative = (params) => inst.check(_lt(0, params));
  inst.nonpositive = (params) => inst.check(_lte(0, params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  inst.step = (value, params) => inst.check(_multipleOf(value, params));
  inst.finite = () => inst;
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
  $ZodBigInt.init(inst, def);
  ZodType.init(inst, def);
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.positive = (params) => inst.check(_gt(BigInt(0), params));
  inst.negative = (params) => inst.check(_lt(BigInt(0), params));
  inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
  inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  const bag = inst._zod.bag;
  inst.minValue = bag.minimum ?? null;
  inst.maxValue = bag.maximum ?? null;
  inst.format = bag.format ?? null;
});
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
var ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
  $ZodBigIntFormat.init(inst, def);
  ZodBigInt.init(inst, def);
});
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
var ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
  $ZodSymbol.init(inst, def);
  ZodType.init(inst, def);
});
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
var ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
  $ZodUndefined.init(inst, def);
  ZodType.init(inst, def);
});
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
});
function _null3(params) {
  return _null2(ZodNull, params);
}
var ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
});
function any() {
  return _any(ZodAny);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
  $ZodVoid.init(inst, def);
  ZodType.init(inst, def);
});
function _void2(params) {
  return _void(ZodVoid, params);
}
var ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
  $ZodDate.init(inst, def);
  ZodType.init(inst, def);
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  const c = inst._zod.bag;
  inst.minDate = c.minimum ? new Date(c.minimum) : null;
  inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function date3(params) {
  return _date(ZodDate, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
  inst.nonempty = (params) => inst.check(_minLength(1, params));
  inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(_length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum2(Object.keys(shape));
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  exports_util.defineLazy(inst, "shape", () => {
    return def.shape;
  });
  inst.keyof = () => _enum2(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: undefined });
  inst.extend = (incoming) => {
    return exports_util.extend(inst, incoming);
  };
  inst.safeExtend = (incoming) => {
    return exports_util.safeExtend(inst, incoming);
  };
  inst.merge = (other) => exports_util.merge(inst, other);
  inst.pick = (mask) => exports_util.pick(inst, mask);
  inst.omit = (mask) => exports_util.omit(inst, mask);
  inst.partial = (...args) => exports_util.partial(ZodOptional, inst, args[0]);
  inst.required = (...args) => exports_util.required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...exports_util.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: never(),
    ...exports_util.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...exports_util.normalizeParams(params)
  });
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...exports_util.normalizeParams(params)
  });
}
var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...exports_util.normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
  $ZodTuple.init(inst, def);
  ZodType.init(inst, def);
  inst.rest = (rest) => inst.clone({
    ...inst._zod.def,
    rest
  });
});
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...exports_util.normalizeParams(params)
  });
}
var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = undefined;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
  $ZodMap.init(inst, def);
  ZodType.init(inst, def);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
  $ZodSet.init(inst, def);
  ZodType.init(inst, def);
  inst.min = (...args) => inst.check(_minSize(...args));
  inst.nonempty = (params) => inst.check(_minSize(1, params));
  inst.max = (...args) => inst.check(_maxSize(...args));
  inst.size = (...args) => inst.check(_size(...args));
});
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...exports_util.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...exports_util.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum2(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...exports_util.normalizeParams(params)
  });
}
var ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
  $ZodFile.init(inst, def);
  ZodType.init(inst, def);
  inst.min = (size, params) => inst.check(_minSize(size, params));
  inst.max = (size, params) => inst.check(_maxSize(size, params));
  inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
  return _file(ZodFile, params);
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(exports_util.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(exports_util.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default2(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
  $ZodSuccess.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch2(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
  $ZodNaN.init(inst, def);
  ZodType.init(inst, def);
});
function nan(params) {
  return _nan(ZodNaN, params);
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
var ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
  ZodPipe.init(inst, def);
  $ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
  $ZodTemplateLiteral.init(inst, def);
  ZodType.init(inst, def);
});
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...exports_util.normalizeParams(params)
  });
}
var ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
  $ZodLazy.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
var ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
  $ZodPromise.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
var ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
  $ZodFunction.init(inst, def);
  ZodType.init(inst, def);
});
function _function(params) {
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
    output: params?.output ?? unknown()
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
});
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return _superRefine(fn);
}
var describe2 = describe;
var meta2 = meta;
function _instanceof(cls, params = {
  error: `Input not instance of ${cls.name}`
}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...exports_util.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  return inst;
}
var stringbool = (...args) => _stringbool({
  Codec: ZodCodec,
  Boolean: ZodBoolean,
  String: ZodString
}, ...args);
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return pipe(transform(fn), schema);
}
// node_modules/zod/v4/classic/compat.js
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom"
};
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
// node_modules/zod/v4/classic/coerce.js
var exports_coerce = {};
__export(exports_coerce, {
  string: () => string3,
  number: () => number3,
  date: () => date4,
  boolean: () => boolean3,
  bigint: () => bigint3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}

// node_modules/zod/v4/classic/external.js
config(en_default());
// src/config-schema.ts
var RuleConfigSchema = exports_external.object({
  name: exports_external.string().min(1, "Rule name must not be empty"),
  file: exports_external.string().regex(/^[^/]+\.md$/, "Rule file must be a .md file in the rules directory"),
  enabled: exports_external.boolean().default(true)
});
var ReviewConfigSchema = exports_external.looseObject({
  builtInRules: exports_external.object({
    componentExtraction: exports_external.boolean(),
    componentReuse: exports_external.boolean(),
    aiSlop: exports_external.boolean()
  }).optional(),
  customRules: exports_external.array(RuleConfigSchema).optional(),
  parallelization: exports_external.object({
    maxConcurrentAgents: exports_external.number().int().min(0, "maxConcurrentAgents must be at least 0").max(20, "maxConcurrentAgents must be at most 20")
  }).optional(),
  reports: exports_external.object({
    outputDirectory: exports_external.string(),
    template: exports_external.string().regex(/^[^/]+\.md$/, "Template must be a .md file").optional(),
    summaryTemplate: exports_external.string().regex(/^[^/]+\.md$/, "Summary template must be a .md file").optional()
  }).optional()
});
var DEFAULT_CONFIG = {
  builtInRules: {
    componentExtraction: true,
    componentReuse: true,
    aiSlop: true
  },
  customRules: [],
  parallelization: {
    maxConcurrentAgents: 0
  },
  reports: {
    outputDirectory: ".claude/code-review-tools/reports"
  }
};
function parseConfig(input) {
  const result = ReviewConfigSchema.safeParse(input);
  if (!result.success) {
    return DEFAULT_CONFIG;
  }
  return {
    builtInRules: result.data.builtInRules ? {
      ...DEFAULT_CONFIG.builtInRules,
      ...result.data.builtInRules
    } : DEFAULT_CONFIG.builtInRules,
    customRules: result.data.customRules ?? DEFAULT_CONFIG.customRules,
    parallelization: result.data.parallelization ? {
      ...DEFAULT_CONFIG.parallelization,
      ...result.data.parallelization
    } : DEFAULT_CONFIG.parallelization,
    reports: result.data.reports ? {
      ...DEFAULT_CONFIG.reports,
      ...result.data.reports
    } : DEFAULT_CONFIG.reports
  };
}

// src/cli.ts
var DEFAULT_DIR = process.cwd();
function success2(data) {
  return { success: true, data };
}
function error46(message) {
  return { success: false, error: message };
}
function loadConfig(configPath, fs = nodeFs) {
  const path = configPath || ".claude/code-review-tools/config.json";
  try {
    if (!fs.existsSync(path)) {
      return success2(DEFAULT_CONFIG);
    }
    const userConfig = JSON.parse(fs.readFileSync(path, "utf-8"));
    const config2 = parseConfig(userConfig);
    return success2(config2);
  } catch (err) {
    return error46(`Failed to load config: ${err.message}`);
  }
}
async function collectCommits(commitHash, dir = DEFAULT_DIR, fs = nodeFs) {
  try {
    const branch = await import_isomorphic_git.currentBranch({ fs, dir }) ?? "HEAD";
    const allCommits = await import_isomorphic_git.log({ fs, dir, ref: "HEAD" });
    const targetIndex = allCommits.findIndex((c) => c.oid.startsWith(commitHash));
    if (targetIndex === -1) {
      return error46(`Commit not found: ${commitHash}`);
    }
    const commitsInRange = allCommits.slice(0, targetIndex + 1);
    if (commitsInRange.length === 0) {
      return success2({
        commits: [],
        branch,
        commitRange: `${commitHash}^..HEAD`,
        totalCommits: 0
      });
    }
    const commits = [];
    for (const commitObj of commitsInRange) {
      const commitData = await import_isomorphic_git.readCommit({ fs, dir, oid: commitObj.oid });
      const message = commitData.commit.message;
      const lines = message.split(`
`);
      const subject = lines[0];
      const body = lines.slice(1).join(`
`).trim() || undefined;
      commits.push({
        hash: commitObj.oid,
        author: commitData.commit.author.name,
        date: new Date(commitData.commit.author.timestamp * 1000).toISOString().split("T")[0],
        subject,
        body
      });
    }
    return success2({
      commits: commits.reverse(),
      branch,
      commitRange: `${commitHash}^..HEAD`,
      totalCommits: commits.length
    });
  } catch (err) {
    return error46(`Failed to collect commits: ${err.message}`);
  }
}
function buildRules(config2, pluginRoot, fs = nodeFs) {
  try {
    const rulesSections = [];
    let enabledCount = 0;
    const builtInRules = [
      {
        key: "componentExtraction",
        file: "component-extraction-rules.md",
        name: "Component Extraction"
      },
      {
        key: "componentReuse",
        file: "component-reuse-rules.md",
        name: "Component Reuse"
      },
      {
        key: "aiSlop",
        file: "ai-slop-rules.md",
        name: "AI Slop"
      }
    ];
    for (const rule of builtInRules) {
      if (config2.builtInRules?.[rule.key]) {
        const rulePath = join(pluginRoot, "rules", rule.file);
        if (fs.existsSync(rulePath)) {
          const content = fs.readFileSync(rulePath, "utf-8");
          rulesSections.push(`# ${rule.name} Rules

${content}

---
`);
          enabledCount++;
        }
      }
    }
    for (const rule of config2.customRules ?? []) {
      if (rule.enabled) {
        const rulePath = `.claude/code-review-tools/rules/${rule.file}`;
        if (fs.existsSync(rulePath)) {
          const content = fs.readFileSync(rulePath, "utf-8");
          rulesSections.push(`# ${rule.name} Rules

${content}

---
`);
          enabledCount++;
        } else {
          return error46(`Custom rule file not found: ${rulePath}`);
        }
      }
    }
    if (rulesSections.length === 0) {
      return error46("No rules enabled in config");
    }
    return success2({
      rulesContent: rulesSections.join(`
`),
      enabledRulesCount: enabledCount
    });
  } catch (err) {
    return error46(`Failed to build rules: ${err.message}`);
  }
}
function loadTemplate(customTemplate, pluginRoot, defaultTemplateName, fs = nodeFs) {
  let templatePath;
  if (customTemplate) {
    templatePath = `.claude/code-review-tools/templates/${customTemplate}`;
  } else {
    templatePath = `${pluginRoot}/templates/${defaultTemplateName}`;
  }
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, "utf-8");
  }
  const defaultPath = `${pluginRoot}/templates/${defaultTemplateName}`;
  if (fs.existsSync(defaultPath)) {
    console.error(`WARNING: Template not found: ${templatePath}, using default`);
    return fs.readFileSync(defaultPath, "utf-8");
  }
  throw new Error(`Template not found: ${defaultPath}`);
}
async function prepareReview(commitHash, pluginRoot, dir = DEFAULT_DIR, fs = nodeFs) {
  try {
    const configResult = loadConfig(undefined, fs);
    if (!configResult.success) {
      return error46(`Failed to load config: ${configResult.error}`);
    }
    const config2 = configResult.data;
    const commitsResult = await collectCommits(commitHash, dir, fs);
    if (!commitsResult.success) {
      return error46(`Failed to collect commits: ${commitsResult.error}`);
    }
    const rulesResult = buildRules(config2, pluginRoot, fs);
    if (!rulesResult.success) {
      return error46(`Failed to build rules: ${rulesResult.error}`);
    }
    const reportTemplate = loadTemplate(config2.reports?.template, pluginRoot, "report-template.md", fs);
    const summaryTemplate = loadTemplate(config2.reports?.summaryTemplate, pluginRoot, "summary-template.md", fs);
    return success2({
      commits: commitsResult.data.commits,
      commitList: commitsResult.data.commits.map((c) => c.hash),
      branch: commitsResult.data.branch,
      commitRange: commitsResult.data.commitRange,
      totalCommits: commitsResult.data.totalCommits,
      rulesContent: rulesResult.data.rulesContent,
      reportTemplate,
      summaryTemplate,
      outputDirectory: config2.reports?.outputDirectory ?? ".claude/code-review-tools/reports",
      maxConcurrentAgents: config2.parallelization?.maxConcurrentAgents ?? 0
    });
  } catch (err) {
    return error46(`Failed to prepare review: ${err.message}`);
  }
}
function printUsage() {
  console.log(`
Code Review CLI (Internal)

Usage:
  cli.js prepare <commit-hash> --plugin-root <path>

Commands:
  prepare <commit-hash> --plugin-root <path>
    Prepare all data needed for code review

Examples:
  cli.js prepare abc123 --plugin-root /path/to/plugin
`);
}
function parseArgs(args) {
  const parsed = {};
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    if (arg === "--plugin-root" && i + 1 < args.length) {
      parsed.pluginRoot = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (!arg.startsWith("--")) {
      if (!parsed.positional) {
        parsed.positional = arg;
      }
    }
  }
  return parsed;
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  const command = args[0];
  const parsedArgs = parseArgs(args.slice(1));
  try {
    switch (command) {
      case "prepare": {
        if (!parsedArgs.positional) {
          console.error("Error: commit hash is required");
          console.error("Usage: cli.js prepare <commit-hash> --plugin-root <path>");
          process.exit(1);
        }
        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required");
          process.exit(1);
        }
        const result = await prepareReview(parsedArgs.positional, parsedArgs.pluginRoot);
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run with --help to see available commands");
        process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error:", err.message);
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
  });
}
export {
  prepareReview,
  loadTemplate,
  loadConfig,
  collectCommits,
  buildRules
};
