'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function select_options(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        option.selected = ~value.indexOf(option.__value);
    }
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe,
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

/**
 * Based on Kendo UI Core expression code <https://github.com/telerik/kendo-ui-core#license-information>
 */

function Cache(maxSize) {
  this._maxSize = maxSize;
  this.clear();
}
Cache.prototype.clear = function() {
  this._size = 0;
  this._values = Object.create(null);
};
Cache.prototype.get = function(key) {
  return this._values[key]
};
Cache.prototype.set = function(key, value) {
  this._size >= this._maxSize && this.clear();
  if (!(key in this._values)) this._size++;

  return (this._values[key] = value)
};

var SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g,
  DIGIT_REGEX = /^\d+$/,
  LEAD_DIGIT_REGEX = /^\d/,
  SPEC_CHAR_REGEX = /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g,
  CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/,
  MAX_CACHE_SIZE = 512;

var pathCache = new Cache(MAX_CACHE_SIZE),
  setCache = new Cache(MAX_CACHE_SIZE),
  getCache = new Cache(MAX_CACHE_SIZE);

var propertyExpr = {
  Cache: Cache,

  split: split,

  normalizePath: normalizePath,

  setter: function(path) {
    var parts = normalizePath(path);

    return (
      setCache.get(path) ||
      setCache.set(path, function setter(data, value) {
        var index = 0,
          len = parts.length;
        while (index < len - 1) {
          data = data[parts[index++]];
        }
        data[parts[index]] = value;
      })
    )
  },

  getter: function(path, safe) {
    var parts = normalizePath(path);
    return (
      getCache.get(path) ||
      getCache.set(path, function getter(data) {
        var index = 0,
          len = parts.length;
        while (index < len) {
          if (data != null || !safe) data = data[parts[index++]];
          else return
        }
        return data
      })
    )
  },

  join: function(segments) {
    return segments.reduce(function(path, part) {
      return (
        path +
        (isQuoted(part) || DIGIT_REGEX.test(part)
          ? '[' + part + ']'
          : (path ? '.' : '') + part)
      )
    }, '')
  },

  forEach: function(path, cb, thisArg) {
    forEach(Array.isArray(path) ? path : split(path), cb, thisArg);
  }
};

function normalizePath(path) {
  return (
    pathCache.get(path) ||
    pathCache.set(
      path,
      split(path).map(function(part) {
        return part.replace(CLEAN_QUOTES_REGEX, '$2')
      })
    )
  )
}

function split(path) {
  return path.match(SPLIT_REGEX)
}

function forEach(parts, iter, thisArg) {
  var len = parts.length,
    part,
    idx,
    isArray,
    isBracket;

  for (idx = 0; idx < len; idx++) {
    part = parts[idx];

    if (part) {
      if (shouldBeQuoted(part)) {
        part = '"' + part + '"';
      }

      isBracket = isQuoted(part);
      isArray = !isBracket && /^\d+$/.test(part);

      iter.call(thisArg, part, isBracket, isArray, idx, parts);
    }
  }
}

function isQuoted(str) {
  return (
    typeof str === 'string' && str && ["'", '"'].indexOf(str.charAt(0)) !== -1
  )
}

function hasLeadingNumber(part) {
  return part.match(LEAD_DIGIT_REGEX) && !part.match(DIGIT_REGEX)
}

function hasSpecialChars(part) {
  return SPEC_CHAR_REGEX.test(part)
}

function shouldBeQuoted(part) {
  return !isQuoted(part) && (hasLeadingNumber(part) || hasSpecialChars(part))
}
var propertyExpr_7 = propertyExpr.forEach;

function subscribeOnce(observable) {
  return new Promise((resolve) => {
    observable.subscribe(resolve)(); // immediately invoke to unsubscribe
  });
}

function update$1(object, path, value) {
  object.update((o) => {
    set(o, path, value);
    return o;
  });
}

function cloneDeep(object) {
  return JSON.parse(JSON.stringify(object));
}

function isNullish(value) {
  return value === undefined || value === null;
}

function isEmpty(object) {
  return isNullish(object) || Object.keys(object).length <= 0;
}

function getValues(object) {
  let result = [];
  for (const key in object) {
    result = result.concat(
      typeof object[key] === 'object' ? getValues(object[key]) : object[key],
    );
  }
  return result;
}

function assignDeep(object, value) {
  if (Array.isArray(object)) {
    return object.map((o) => assignDeep(o, value));
  }
  const copy = {};
  for (const key in object) {
    copy[key] =
      typeof object[key] === 'object' ? assignDeep(object[key], value) : value;
  }
  return copy;
}

function has(object, key) {
  return (
    object != undefined && Object.prototype.hasOwnProperty.call(object, key)
  );
}

function set(object, path, value) {
  if (new Object(object) !== object) return object;

  if (!Array.isArray(path)) {
    path = path.toString().match(/[^.[\]]+/g) || [];
  }

  const result = path
    .slice(0, -1)
    .reduce(
      (accumulator, key, index) =>
        new Object(accumulator[key]) === accumulator[key]
          ? accumulator[key]
          : (accumulator[key] =
              Math.abs(path[index + 1]) >> 0 === +path[index + 1] ? [] : {}),
      object,
    );

  result[path[path.length - 1]] = value;

  return object;
}

// Implementation of yup.reach
// TODO rewrite to simpler version and remove dependency on forEach
function reach(object, path, value, context) {
  return getIn(object, path, value, context).schema;
}

function trim(part) {
  return part.slice(0, -1).slice(1);
}

function getIn(schema, path, value, context) {
  let parent, lastPart;

  context = context || value;

  if (!path)
    return {
      parent,
      parentPath: path,
      schema,
    };

  propertyExpr_7(path, (_part, isBracket, isArray) => {
    let part = isBracket ? trim(_part) : _part;

    if (isArray || has(schema, '_subType')) {
      let index = isArray ? Number.parseInt(part, 10) : 0;
      schema = schema.resolve({context, parent, value})._subType;
      if (value) {
        value = value[index];
      }
    }

    if (!isArray) {
      schema = schema.resolve({context, parent, value});
      schema = schema.fields[part];
      parent = value;
      value = value && value[part];
      lastPart = part;
    }
  });

  return {schema, parent, parentPath: lastPart};
}

const util = {
  assignDeep,
  cloneDeep,
  getValues,
  isEmpty,
  reach,
  subscribeOnce,
  update: update$1,
  isNullish,
};

const NO_ERROR = '';
const IS_TOUCHED = true;

function isCheckbox(element) {
  return element.getAttribute && element.getAttribute('type') === 'checkbox';
}

const createForm = (config) => {
  let initialValues = config.initialValues || {};

  if (!isInitialValuesValid()) {
    return;
  }

  const validationSchema = config.validationSchema;
  const validateFn = config.validate;
  const onSubmit = config.onSubmit;

  const getInitial = {
    values: () => util.cloneDeep(initialValues),
    errors: () => util.assignDeep(initialValues, NO_ERROR),
    touched: () => util.assignDeep(initialValues, !IS_TOUCHED),
  };

  const form = writable(getInitial.values());
  const errors = writable(getInitial.errors());
  const touched = writable(getInitial.touched());

  const isSubmitting = writable(false);
  const isValidating = writable(false);

  const isValid = derived([errors, touched], ([$errors, $touched]) => {
    const allTouched = util
      .getValues($touched)
      .every((field) => field === IS_TOUCHED);
    const noErrors = util
      .getValues($errors)
      .every((field) => field === NO_ERROR);
    return allTouched && noErrors;
  });

  const modified = derived(form, ($form) => {
    const object = util.assignDeep($form, false);

    for (let key in $form) {
      if ($form[key] !== initialValues[key]) {
        object[key] = true;
      }
    }

    return object;
  });

  const isModified = derived(modified, ($modified) => {
    return util.getValues($modified).some((field) => field === true);
  });

  function validateField(field) {
    return util
      .subscribeOnce(form)
      .then((values) => validateFieldValue(field, values[field]));
  }

  function validateFieldValue(field, value) {
    updateTouched(field, true);

    if (validationSchema) {
      isValidating.set(true);
      return util
        .reach(validationSchema, field)
        .validate(value)
        .then(() => util.update(errors, field, ''))
        .catch((error) => util.update(errors, field, error.message))
        .finally(() => {
          isValidating.set(false);
        });
    }

    if (validateFn) {
      isValidating.set(true);
      return Promise.resolve()
        .then(() => validateFn({[field]: value}))
        .then((errs) =>
          util.update(errors, field, !util.isNullish(errs) ? errs[field] : ''),
        )
        .finally(() => {
          isValidating.set(false);
        });
    }

    return Promise.resolve();
  }

  function updateValidateField(field, value) {
    return validateFieldValue(field, value).then(() => {
      updateField(field, value);
    });
  }

  function handleChange(event) {
    const element = event.target;
    const field = element.name || element.id;
    const value = isCheckbox(element) ? element.checked : element.value;

    return updateValidateField(field, value);
  }

  function handleSubmit(ev) {
    if (ev && ev.preventDefault) {
      ev.preventDefault();
    }

    isSubmitting.set(true);

    return util.subscribeOnce(form).then((values) => {
      if (typeof validateFn === 'function') {
        isValidating.set(true);

        return Promise.resolve()
          .then(() => validateFn(values))
          .then((error) => {
            if (util.isEmpty(error)) {
              clearErrorsAndSubmit(values);
            } else {
              errors.set(error);
              isSubmitting.set(false);
            }
          })
          .finally(() => isValidating.set(false));
      }

      if (validationSchema) {
        isValidating.set(true);

        return (
          validationSchema
            .validate(values, {abortEarly: false})
            .then(() => clearErrorsAndSubmit(values))
            // eslint-disable-next-line unicorn/catch-error-name
            .catch((yupErrors) => {
              if (yupErrors && yupErrors.inner) {
                yupErrors.inner.forEach((error) =>
                  util.update(errors, error.path, error.message),
                );
              }
              isSubmitting.set(false);
            })
            .finally(() => isValidating.set(false))
        );
      }

      clearErrorsAndSubmit(values);
    });
  }

  function handleReset() {
    form.set(getInitial.values());
    errors.set(getInitial.errors());
    touched.set(getInitial.touched());
  }

  function clearErrorsAndSubmit(values) {
    return Promise.resolve()
      .then(() => errors.set(util.assignDeep(values, '')))
      .then(() => onSubmit(values, form, errors))
      .finally(() => isSubmitting.set(false));
  }

  /**
   * Handler to imperatively update the value of a form field
   */
  function updateField(field, value) {
    util.update(form, field, value);
  }

  /**
   * Handler to imperatively update the touched value of a form field
   */
  function updateTouched(field, value) {
    util.update(touched, field, value);
  }

  function isInitialValuesValid() {
    if (Object.keys(initialValues).length === 0) {
      const provided = JSON.stringify(initialValues);

      // eslint-disable-next-line no-undef
      console.warn(
        `createForm requires initialValues to be a non empty object or array, provided ${provided}`,
      );

      return false;
    }

    return true;
  }

  /**
   * Update the initial values and reset form. Used to dynamically display new form values
   */
  function updateInitialValues(newValues) {
    if (!isInitialValuesValid()) {
      return;
    }

    initialValues = newValues;

    handleReset();
  }

  return {
    form,
    errors,
    touched,
    modified,
    isValid,
    isSubmitting,
    isValidating,
    isModified,
    handleChange,
    handleSubmit,
    handleReset,
    updateField,
    updateValidateField,
    updateTouched,
    validateField,
    updateInitialValues,
    state: derived(
      [
        form,
        errors,
        touched,
        modified,
        isValid,
        isValidating,
        isSubmitting,
        isModified,
      ],
      ([
        $form,
        $errors,
        $touched,
        $modified,
        $isValid,
        $isValidating,
        $isSubmitting,
        $isModified,
      ]) => ({
        form: $form,
        errors: $errors,
        touched: $touched,
        modified: $modified,
        isValid: $isValid,
        isSubmitting: $isSubmitting,
        isValidating: $isValidating,
        isModified: $isModified,
      }),
    ),
  };
};

const key = {};

/* lib/components/Form.svelte generated by Svelte v3.24.0 */
const get_default_slot_changes = dirty => ({});

const get_default_slot_context = ctx => ({
	form: /*form*/ ctx[0],
	errors: /*errors*/ ctx[1],
	touched: /*touched*/ ctx[2],
	state: /*state*/ ctx[3],
	handleChange: /*handleChange*/ ctx[4],
	handleSubmit: /*handleSubmit*/ ctx[5],
	updateField: /*updateField*/ ctx[6],
	updateTouched: /*updateTouched*/ ctx[7]
});

function create_fragment(ctx) {
	let form_1;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*$$slots*/ ctx[14].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], get_default_slot_context);
	let form_1_levels = [/*$$props*/ ctx[8]];
	let form_1_data = {};

	for (let i = 0; i < form_1_levels.length; i += 1) {
		form_1_data = assign(form_1_data, form_1_levels[i]);
	}

	return {
		c() {
			form_1 = element("form");
			if (default_slot) default_slot.c();
			set_attributes(form_1, form_1_data);
		},
		m(target, anchor) {
			insert(target, form_1, anchor);

			if (default_slot) {
				default_slot.m(form_1, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(form_1, "submit", /*handleSubmit*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8192) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_default_slot_changes, get_default_slot_context);
				}
			}

			set_attributes(form_1, form_1_data = get_spread_update(form_1_levels, [dirty & /*$$props*/ 256 && /*$$props*/ ctx[8]]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(form_1);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { initialValues = {} } = $$props;
	let { validate = null } = $$props;
	let { validationSchema = null } = $$props;
	let { onSubmit } = $$props;

	const { form, errors, touched, state, handleChange, handleSubmit, updateField, updateTouched } = createForm({
		initialValues,
		validationSchema,
		validate,
		onSubmit
	});

	setContext(key, {
		form,
		errors,
		touched,
		state,
		handleChange,
		handleSubmit,
		updateField,
		updateTouched
	});

	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$new_props => {
		$$invalidate(8, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("initialValues" in $$new_props) $$invalidate(9, initialValues = $$new_props.initialValues);
		if ("validate" in $$new_props) $$invalidate(10, validate = $$new_props.validate);
		if ("validationSchema" in $$new_props) $$invalidate(11, validationSchema = $$new_props.validationSchema);
		if ("onSubmit" in $$new_props) $$invalidate(12, onSubmit = $$new_props.onSubmit);
		if ("$$scope" in $$new_props) $$invalidate(13, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);

	return [
		form,
		errors,
		touched,
		state,
		handleChange,
		handleSubmit,
		updateField,
		updateTouched,
		$$props,
		initialValues,
		validate,
		validationSchema,
		onSubmit,
		$$scope,
		$$slots
	];
}

class Form extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance, create_fragment, safe_not_equal, {
			initialValues: 9,
			validate: 10,
			validationSchema: 11,
			onSubmit: 12
		});
	}
}

/* lib/components/Field.svelte generated by Svelte v3.24.0 */

function create_fragment$1(ctx) {
	let input;
	let input_value_value;
	let mounted;
	let dispose;

	let input_levels = [
		{ name: /*name*/ ctx[0] },
		{ type: /*type*/ ctx[1] },
		{
			value: input_value_value = /*$form*/ ctx[2][/*name*/ ctx[0]]
		},
		/*$$props*/ ctx[5]
	];

	let input_data = {};

	for (let i = 0; i < input_levels.length; i += 1) {
		input_data = assign(input_data, input_levels[i]);
	}

	return {
		c() {
			input = element("input");
			set_attributes(input, input_data);
		},
		m(target, anchor) {
			insert(target, input, anchor);

			if (!mounted) {
				dispose = [
					listen(input, "change", /*handleChange*/ ctx[4]),
					listen(input, "blur", /*handleChange*/ ctx[4])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			set_attributes(input, input_data = get_spread_update(input_levels, [
				dirty & /*name*/ 1 && { name: /*name*/ ctx[0] },
				dirty & /*type*/ 2 && { type: /*type*/ ctx[1] },
				dirty & /*$form, name*/ 5 && input_value_value !== (input_value_value = /*$form*/ ctx[2][/*name*/ ctx[0]]) && input.value !== input_value_value && { value: input_value_value },
				dirty & /*$$props*/ 32 && /*$$props*/ ctx[5]
			]));
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $form;
	let { name } = $$props;
	let { type = "text" } = $$props;
	const { form, handleChange } = getContext(key);
	component_subscribe($$self, form, value => $$invalidate(2, $form = value));

	$$self.$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("name" in $$new_props) $$invalidate(0, name = $$new_props.name);
		if ("type" in $$new_props) $$invalidate(1, type = $$new_props.type);
	};

	$$props = exclude_internal_props($$props);
	return [name, type, $form, form, handleChange, $$props];
}

class Field extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0, type: 1 });
	}
}

/* lib/components/Select.svelte generated by Svelte v3.24.0 */

function create_fragment$2(ctx) {
	let select;
	let select_value_value;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*$$slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

	let select_levels = [
		{ name: /*name*/ ctx[0] },
		{
			value: select_value_value = /*$form*/ ctx[1][/*name*/ ctx[0]]
		},
		/*$$props*/ ctx[4]
	];

	let select_data = {};

	for (let i = 0; i < select_levels.length; i += 1) {
		select_data = assign(select_data, select_levels[i]);
	}

	return {
		c() {
			select = element("select");
			if (default_slot) default_slot.c();
			set_attributes(select, select_data);
		},
		m(target, anchor) {
			insert(target, select, anchor);

			if (default_slot) {
				default_slot.m(select, null);
			}

			if (select_data.multiple) select_options(select, select_data.value);
			current = true;

			if (!mounted) {
				dispose = [
					listen(select, "change", /*handleChange*/ ctx[3]),
					listen(select, "blur", /*handleChange*/ ctx[3])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 32) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
				}
			}

			set_attributes(select, select_data = get_spread_update(select_levels, [
				(!current || dirty & /*name*/ 1) && { name: /*name*/ ctx[0] },
				(!current || dirty & /*$form, name*/ 3 && select_value_value !== (select_value_value = /*$form*/ ctx[1][/*name*/ ctx[0]])) && { value: select_value_value },
				dirty & /*$$props*/ 16 && /*$$props*/ ctx[4]
			]));

			if (dirty & /*name, $form, $$props*/ 19 && select_data.multiple) select_options(select, select_data.value);
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(select);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let $form;
	let { name } = $$props;
	const { form, handleChange } = getContext(key);
	component_subscribe($$self, form, value => $$invalidate(1, $form = value));
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$new_props => {
		$$invalidate(4, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("name" in $$new_props) $$invalidate(0, name = $$new_props.name);
		if ("$$scope" in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [name, $form, form, handleChange, $$props, $$scope, $$slots];
}

class Select extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0 });
	}
}

/* lib/components/ErrorMessage.svelte generated by Svelte v3.24.0 */

function create_if_block(ctx) {
	let small;
	let t_value = /*$errors*/ ctx[1][/*name*/ ctx[0]] + "";
	let t;
	let small_levels = [/*$$props*/ ctx[3]];
	let small_data = {};

	for (let i = 0; i < small_levels.length; i += 1) {
		small_data = assign(small_data, small_levels[i]);
	}

	return {
		c() {
			small = element("small");
			t = text(t_value);
			set_attributes(small, small_data);
		},
		m(target, anchor) {
			insert(target, small, anchor);
			append(small, t);
		},
		p(ctx, dirty) {
			if (dirty & /*$errors, name*/ 3 && t_value !== (t_value = /*$errors*/ ctx[1][/*name*/ ctx[0]] + "")) set_data(t, t_value);
			set_attributes(small, small_data = get_spread_update(small_levels, [dirty & /*$$props*/ 8 && /*$$props*/ ctx[3]]));
		},
		d(detaching) {
			if (detaching) detach(small);
		}
	};
}

function create_fragment$3(ctx) {
	let if_block_anchor;
	let if_block = /*$errors*/ ctx[1][/*name*/ ctx[0]] && create_if_block(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*$errors*/ ctx[1][/*name*/ ctx[0]]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let $errors;
	let { name } = $$props;
	const { errors } = getContext(key);
	component_subscribe($$self, errors, value => $$invalidate(1, $errors = value));

	$$self.$set = $$new_props => {
		$$invalidate(3, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("name" in $$new_props) $$invalidate(0, name = $$new_props.name);
	};

	$$props = exclude_internal_props($$props);
	return [name, $errors, errors, $$props];
}

class ErrorMessage extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { name: 0 });
	}
}

exports.ErrorMessage = ErrorMessage;
exports.Field = Field;
exports.Form = Form;
exports.Select = Select;
exports.createForm = createForm;
