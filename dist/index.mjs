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
function is_empty(obj) {
    return Object.keys(obj).length === 0;
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
function space() {
    return text(' ');
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
function children(element) {
    return Array.from(element.childNodes);
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
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
        set_current_component(null);
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
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
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
/**
 * Base class for Svelte components. Used when dev=false.
 */
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
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = "div.wrapper.svelte-1lddsds{width:100%;height:100%;display:inline-flex}div.separator.svelte-1lddsds{cursor:col-resize;height:100%;width:4px;margin-left:-2px;z-index:1;background-color:#aaa;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='30'><path d='M2 0 v30 M5 0 v30 M8 0 v30' fill='none' stroke='black'/></svg>\");background-repeat:no-repeat;background-position:center}div.left.svelte-1lddsds{width:var(--left-panel-size);min-width:var(--min-left-panel-size);height:100%}div.right.svelte-1lddsds{width:var(--right-panel-size);min-width:var(--min-right-panel-size);height:100%}";
styleInject(css_248z);

/* src\HSplitPane.svelte generated by Svelte v3.31.0 */
const get_right_slot_changes = dirty => ({});
const get_right_slot_context = ctx => ({});
const get_left_slot_changes = dirty => ({});
const get_left_slot_context = ctx => ({});

// (104:26)               
function fallback_block_1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "Left Contents goes here...";
			set_style(div, "background-color", "red");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (113:27)               
function fallback_block(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "Right Contents goes here...";
			set_style(div, "background-color", "yellow");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment(ctx) {
	let div3;
	let div0;
	let t0;
	let div1;
	let t1;
	let div2;
	let current;
	let mounted;
	let dispose;
	const left_slot_template = /*#slots*/ ctx[10].left;
	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[9], get_left_slot_context);
	const left_slot_or_fallback = left_slot || fallback_block_1();
	const right_slot_template = /*#slots*/ ctx[10].right;
	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[9], get_right_slot_context);
	const right_slot_or_fallback = right_slot || fallback_block();

	return {
		c() {
			div3 = element("div");
			div0 = element("div");
			if (left_slot_or_fallback) left_slot_or_fallback.c();
			t0 = space();
			div1 = element("div");
			t1 = space();
			div2 = element("div");
			if (right_slot_or_fallback) right_slot_or_fallback.c();
			attr(div0, "class", "left svelte-1lddsds");
			attr(div1, "class", "separator svelte-1lddsds");
			attr(div2, "class", "right svelte-1lddsds");
			attr(div3, "class", "wrapper svelte-1lddsds");
			set_style(div3, "--left-panel-size", /*leftPaneSize*/ ctx[0]);
			set_style(div3, "--right-panel-size", /*rightPaneSize*/ ctx[1]);
			set_style(div3, "--min-left-panel-size", /*minLeftPaneSize*/ ctx[2]);
			set_style(div3, "--min-right-panel-size", /*minRightPaneSize*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);

			if (left_slot_or_fallback) {
				left_slot_or_fallback.m(div0, null);
			}

			/*div0_binding*/ ctx[11](div0);
			append(div3, t0);
			append(div3, div1);
			/*div1_binding*/ ctx[12](div1);
			append(div3, t1);
			append(div3, div2);

			if (right_slot_or_fallback) {
				right_slot_or_fallback.m(div2, null);
			}

			/*div2_binding*/ ctx[13](div2);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div1, "mousedown", /*onMouseDown*/ ctx[7]),
					listen(div1, "touchstart", /*onMouseDown*/ ctx[7])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (left_slot) {
				if (left_slot.p && dirty & /*$$scope*/ 512) {
					update_slot(left_slot, left_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_left_slot_changes, get_left_slot_context);
				}
			}

			if (right_slot) {
				if (right_slot.p && dirty & /*$$scope*/ 512) {
					update_slot(right_slot, right_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_right_slot_changes, get_right_slot_context);
				}
			}

			if (!current || dirty & /*leftPaneSize*/ 1) {
				set_style(div3, "--left-panel-size", /*leftPaneSize*/ ctx[0]);
			}

			if (!current || dirty & /*rightPaneSize*/ 2) {
				set_style(div3, "--right-panel-size", /*rightPaneSize*/ ctx[1]);
			}

			if (!current || dirty & /*minLeftPaneSize*/ 4) {
				set_style(div3, "--min-left-panel-size", /*minLeftPaneSize*/ ctx[2]);
			}

			if (!current || dirty & /*minRightPaneSize*/ 8) {
				set_style(div3, "--min-right-panel-size", /*minRightPaneSize*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(left_slot_or_fallback, local);
			transition_in(right_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(left_slot_or_fallback, local);
			transition_out(right_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			if (left_slot_or_fallback) left_slot_or_fallback.d(detaching);
			/*div0_binding*/ ctx[11](null);
			/*div1_binding*/ ctx[12](null);
			if (right_slot_or_fallback) right_slot_or_fallback.d(detaching);
			/*div2_binding*/ ctx[13](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let separator;

	let { updateCallback = () => {
		// do nothing
		return;
	} } = $$props;

	let md;

	const onMouseDown = e => {
		e.preventDefault();
		if (e.button !== 0) return;

		md = {
			e,
			offsetLeft: separator.offsetLeft,
			offsetTop: separator.offsetTop,
			firstWidth: left.offsetWidth,
			secondWidth: right.offsetWidth
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("touchmove", onMouseMove);
		window.addEventListener("touchend", onMouseUp);
	};

	const onMouseMove = e => {
		e.preventDefault();
		if (e.button !== 0) return;

		var delta = {
			x: e.clientX - md.e.clientX,
			y: e.clientY - md.e.clientY
		};

		// Prevent negative-sized elements
		delta.x = Math.min(Math.max(delta.x, -md.firstWidth), md.secondWidth);

		$$invalidate(4, separator.style.left = md.offsetLeft + delta.x + "px", separator);
		$$invalidate(5, left.style.width = md.firstWidth + delta.x + "px", left);
		$$invalidate(6, right.style.width = md.secondWidth - delta.x + "px", right);
		updateCallback();
	};

	const onMouseUp = e => {
		if (e) {
			e.preventDefault();
			if (e.button !== 0) return;
		}

		updateCallback();
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mouseup", onMouseUp);
		window.removeEventListener("touchmove", onMouseMove);
		window.removeEventListener("touchend", onMouseUp);
	};

	function resetSize() {
		if (left) left.removeAttribute("style");
		if (right) right.removeAttribute("style");
		if (separator) separator.removeAttribute("style");
	}

	function onResize() {
		onMouseUp();
		resetSize();
	}

	onMount(() => {
		window.addEventListener("resize", onResize);
	});

	onDestroy(() => {
		window.removeEventListener("resize", onResize);
	});

	let left, right;
	let { leftPaneSize = "50%" } = $$props;
	let { rightPaneSize = "50%" } = $$props;
	let { minLeftPaneSize = "0" } = $$props;
	let { minRightPaneSize = "0" } = $$props;

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			left = $$value;
			$$invalidate(5, left);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			separator = $$value;
			$$invalidate(4, separator);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			right = $$value;
			$$invalidate(6, right);
		});
	}

	$$self.$$set = $$props => {
		if ("updateCallback" in $$props) $$invalidate(8, updateCallback = $$props.updateCallback);
		if ("leftPaneSize" in $$props) $$invalidate(0, leftPaneSize = $$props.leftPaneSize);
		if ("rightPaneSize" in $$props) $$invalidate(1, rightPaneSize = $$props.rightPaneSize);
		if ("minLeftPaneSize" in $$props) $$invalidate(2, minLeftPaneSize = $$props.minLeftPaneSize);
		if ("minRightPaneSize" in $$props) $$invalidate(3, minRightPaneSize = $$props.minRightPaneSize);
		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*leftPaneSize*/ 1) {
			 leftPaneSize && resetSize();
		}

		if ($$self.$$.dirty & /*rightPaneSize*/ 2) {
			 rightPaneSize && resetSize();
		}
	};

	return [
		leftPaneSize,
		rightPaneSize,
		minLeftPaneSize,
		minRightPaneSize,
		separator,
		left,
		right,
		onMouseDown,
		updateCallback,
		$$scope,
		slots,
		div0_binding,
		div1_binding,
		div2_binding
	];
}

class HSplitPane extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance, create_fragment, safe_not_equal, {
			updateCallback: 8,
			leftPaneSize: 0,
			rightPaneSize: 1,
			minLeftPaneSize: 2,
			minRightPaneSize: 3
		});
	}
}

var css_248z$1 = "div.wrapper.svelte-1uzebfl{width:100%;height:100%;display:flex;flex-direction:column}div.separator.svelte-1uzebfl{cursor:row-resize;width:100%;height:4px;margin-top:-2px;z-index:1;background-color:#aaa}div.top.svelte-1uzebfl{height:var(--top-panel-size);min-height:var(--min-top-panel-size);width:100%}div.down.svelte-1uzebfl{height:var(--down-panel-size);min-height:var(--min-down-panel-size);width:100%}";
styleInject(css_248z$1);

/* src\VSplitPane.svelte generated by Svelte v3.31.0 */
const get_down_slot_changes = dirty => ({});
const get_down_slot_context = ctx => ({});
const get_top_slot_changes = dirty => ({});
const get_top_slot_context = ctx => ({});

// (103:25)               
function fallback_block_1$1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "Top Contents goes here...";
			set_style(div, "background-color", "red");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (112:26)               
function fallback_block$1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "Down Contents goes here...";
			set_style(div, "background-color", "yellow");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment$1(ctx) {
	let div3;
	let div0;
	let t0;
	let div1;
	let t1;
	let div2;
	let current;
	let mounted;
	let dispose;
	const top_slot_template = /*#slots*/ ctx[10].top;
	const top_slot = create_slot(top_slot_template, ctx, /*$$scope*/ ctx[9], get_top_slot_context);
	const top_slot_or_fallback = top_slot || fallback_block_1$1();
	const down_slot_template = /*#slots*/ ctx[10].down;
	const down_slot = create_slot(down_slot_template, ctx, /*$$scope*/ ctx[9], get_down_slot_context);
	const down_slot_or_fallback = down_slot || fallback_block$1();

	return {
		c() {
			div3 = element("div");
			div0 = element("div");
			if (top_slot_or_fallback) top_slot_or_fallback.c();
			t0 = space();
			div1 = element("div");
			t1 = space();
			div2 = element("div");
			if (down_slot_or_fallback) down_slot_or_fallback.c();
			attr(div0, "class", "top svelte-1uzebfl");
			attr(div1, "class", "separator svelte-1uzebfl");
			attr(div2, "class", "down svelte-1uzebfl");
			attr(div3, "class", "wrapper svelte-1uzebfl");
			set_style(div3, "--top-panel-size", /*topPanelSize*/ ctx[0]);
			set_style(div3, "--down-panel-size", /*downPanelSize*/ ctx[1]);
			set_style(div3, "--min-top-panel-size", /*minTopPaneSize*/ ctx[2]);
			set_style(div3, "--min-down-panel-size", /*minDownPaneSize*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);

			if (top_slot_or_fallback) {
				top_slot_or_fallback.m(div0, null);
			}

			/*div0_binding*/ ctx[11](div0);
			append(div3, t0);
			append(div3, div1);
			/*div1_binding*/ ctx[12](div1);
			append(div3, t1);
			append(div3, div2);

			if (down_slot_or_fallback) {
				down_slot_or_fallback.m(div2, null);
			}

			/*div2_binding*/ ctx[13](div2);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div1, "mousedown", /*onMouseDown*/ ctx[7]),
					listen(div1, "touchstart", /*onMouseDown*/ ctx[7])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (top_slot) {
				if (top_slot.p && dirty & /*$$scope*/ 512) {
					update_slot(top_slot, top_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_top_slot_changes, get_top_slot_context);
				}
			}

			if (down_slot) {
				if (down_slot.p && dirty & /*$$scope*/ 512) {
					update_slot(down_slot, down_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_down_slot_changes, get_down_slot_context);
				}
			}

			if (!current || dirty & /*topPanelSize*/ 1) {
				set_style(div3, "--top-panel-size", /*topPanelSize*/ ctx[0]);
			}

			if (!current || dirty & /*downPanelSize*/ 2) {
				set_style(div3, "--down-panel-size", /*downPanelSize*/ ctx[1]);
			}

			if (!current || dirty & /*minTopPaneSize*/ 4) {
				set_style(div3, "--min-top-panel-size", /*minTopPaneSize*/ ctx[2]);
			}

			if (!current || dirty & /*minDownPaneSize*/ 8) {
				set_style(div3, "--min-down-panel-size", /*minDownPaneSize*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(top_slot_or_fallback, local);
			transition_in(down_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(top_slot_or_fallback, local);
			transition_out(down_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			if (top_slot_or_fallback) top_slot_or_fallback.d(detaching);
			/*div0_binding*/ ctx[11](null);
			/*div1_binding*/ ctx[12](null);
			if (down_slot_or_fallback) down_slot_or_fallback.d(detaching);
			/*div2_binding*/ ctx[13](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let separator;

	let { updateCallback = () => {
		// do nothing
		return;
	} } = $$props;

	let md;

	const onMouseDown = e => {
		e.preventDefault();
		if (e.button !== 0) return;

		md = {
			e,
			offsetLeft: separator.offsetLeft,
			offsetTop: separator.offsetTop,
			firstHeight: top.offsetHeight,
			secondHeight: down.offsetHeight
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("touchmove", onMouseMove);
		window.addEventListener("touchend", onMouseUp);
	};

	const onMouseMove = e => {
		e.preventDefault();
		if (e.button !== 0) return;

		var delta = {
			x: e.clientX - md.e.clientX,
			y: e.clientY - md.e.clientY
		};

		// Prevent negative-sized elements
		delta.y = Math.min(Math.max(delta.y, -md.firstHeight), md.secondHeight);

		$$invalidate(4, separator.style.top = md.offsetTop + delta.y + "px", separator);
		$$invalidate(5, top.style.height = md.firstHeight + delta.y + "px", top);
		$$invalidate(6, down.style.height = md.secondHeight - delta.y + "px", down);
		updateCallback();
	};

	const onMouseUp = e => {
		if (e) {
			e.preventDefault();
			if (e.button !== 0) return;
		}

		updateCallback();
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mouseup", onMouseUp);
		window.removeEventListener("touchmove", onMouseMove);
		window.removeEventListener("touchend", onMouseUp);
	};

	function resetSize() {
		if (top) top.removeAttribute("style");
		if (down) down.removeAttribute("style");
		if (separator) separator.removeAttribute("style");
	}

	function onResize() {
		onMouseUp();
		resetSize();
	}

	onMount(() => {
		window.addEventListener("resize", onResize);
	});

	onDestroy(() => {
		window.removeEventListener("resize", onResize);
	});

	let top, down;
	let { topPanelSize = "50%" } = $$props;
	let { downPanelSize = "50%" } = $$props;
	let { minTopPaneSize = "0" } = $$props;
	let { minDownPaneSize = "0" } = $$props;

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			top = $$value;
			$$invalidate(5, top);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			separator = $$value;
			$$invalidate(4, separator);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			down = $$value;
			$$invalidate(6, down);
		});
	}

	$$self.$$set = $$props => {
		if ("updateCallback" in $$props) $$invalidate(8, updateCallback = $$props.updateCallback);
		if ("topPanelSize" in $$props) $$invalidate(0, topPanelSize = $$props.topPanelSize);
		if ("downPanelSize" in $$props) $$invalidate(1, downPanelSize = $$props.downPanelSize);
		if ("minTopPaneSize" in $$props) $$invalidate(2, minTopPaneSize = $$props.minTopPaneSize);
		if ("minDownPaneSize" in $$props) $$invalidate(3, minDownPaneSize = $$props.minDownPaneSize);
		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*topPanelSize*/ 1) {
			 topPanelSize && resetSize();
		}

		if ($$self.$$.dirty & /*downPanelSize*/ 2) {
			 downPanelSize && resetSize();
		}
	};

	return [
		topPanelSize,
		downPanelSize,
		minTopPaneSize,
		minDownPaneSize,
		separator,
		top,
		down,
		onMouseDown,
		updateCallback,
		$$scope,
		slots,
		div0_binding,
		div1_binding,
		div2_binding
	];
}

class VSplitPane extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
			updateCallback: 8,
			topPanelSize: 0,
			downPanelSize: 1,
			minTopPaneSize: 2,
			minDownPaneSize: 3
		});
	}
}

export { HSplitPane, VSplitPane };
