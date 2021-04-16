
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
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
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /* src/App.svelte generated by Svelte v3.37.0 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[45] = list[i];
    	return child_ctx;
    }

    // (118:0) {#if showFeedbackDialog}
    function create_if_block_1(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t1;
    	let div1;
    	let div0;
    	let t2;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let label0;
    	let span0;
    	let t5;
    	let t6;
    	let input2;
    	let t7;
    	let t8;
    	let label1;
    	let span1;
    	let t9;
    	let t10;
    	let textarea;
    	let t11;
    	let t12;
    	let footer;
    	let button0;
    	let t14;
    	let button1;
    	let t15;
    	let button1_disabled_value;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*_emailHelp*/ ctx[9] && create_if_block_3(ctx);
    	let if_block1 = /*_bodyHelp*/ ctx[10] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Feedback";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			label0 = element("label");
    			span0 = element("span");
    			t5 = text(/*_emailLabel*/ ctx[8]);
    			t6 = space();
    			input2 = element("input");
    			t7 = space();
    			if (if_block0) if_block0.c();
    			t8 = space();
    			label1 = element("label");
    			span1 = element("span");
    			t9 = text(/*_bodyLabel*/ ctx[11]);
    			t10 = space();
    			textarea = element("textarea");
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			footer = element("footer");
    			button0 = element("button");
    			button0.textContent = "Cancel";
    			t14 = space();
    			button1 = element("button");
    			t15 = text(/*_submitButtonLabel*/ ctx[14]);
    			add_location(h1, file, 122, 6, 3230);
    			add_location(header, file, 121, 4, 3215);
    			attr_dev(div0, "class", "type-picker");
    			add_location(div0, file, 125, 6, 3291);
    			attr_dev(input0, "type", "hidden");
    			input0.value = /*app*/ ctx[16];
    			add_location(input0, file, 134, 6, 3590);
    			attr_dev(input1, "type", "hidden");
    			input1.value = window.navigator.userAgent;
    			add_location(input1, file, 135, 6, 3632);
    			attr_dev(span0, "class", "label");
    			add_location(span0, file, 137, 9, 3713);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", /*_emailPlaceholder*/ ctx[7]);
    			add_location(input2, file, 138, 8, 3762);
    			add_location(label0, file, 136, 6, 3697);
    			attr_dev(span1, "class", "label");
    			add_location(span1, file, 142, 9, 3940);
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", /*_bodyPlaceholder*/ ctx[13]);
    			add_location(textarea, file, 143, 8, 3988);
    			add_location(label1, file, 141, 6, 3924);
    			add_location(button0, file, 151, 4, 4195);
    			button1.disabled = button1_disabled_value = !/*canSubmitButton*/ ctx[15];
    			attr_dev(button1, "messagetype", "submit");
    			add_location(button1, file, 152, 4, 4260);
    			add_location(footer, file, 150, 3, 4182);
    			attr_dev(div1, "class", "form");
    			add_location(div1, file, 124, 4, 3266);
    			attr_dev(main, "class", "feedback-dialog feedback");
    			add_location(main, file, 118, 2, 3164);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(main, t1);
    			append_dev(main, div1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div1, t2);
    			append_dev(div1, input0);
    			append_dev(div1, t3);
    			append_dev(div1, input1);
    			append_dev(div1, t4);
    			append_dev(div1, label0);
    			append_dev(label0, span0);
    			append_dev(span0, t5);
    			append_dev(label0, t6);
    			append_dev(label0, input2);
    			set_input_value(input2, /*email*/ ctx[6]);
    			append_dev(label0, t7);
    			if (if_block0) if_block0.m(label0, null);
    			append_dev(div1, t8);
    			append_dev(div1, label1);
    			append_dev(label1, span1);
    			append_dev(span1, t9);
    			append_dev(label1, t10);
    			append_dev(label1, textarea);
    			set_input_value(textarea, /*body*/ ctx[2]);
    			append_dev(label1, t11);
    			if (if_block1) if_block1.m(label1, null);
    			append_dev(div1, t12);
    			append_dev(div1, footer);
    			append_dev(footer, button0);
    			append_dev(footer, t14);
    			append_dev(footer, button1);
    			append_dev(button1, t15);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[39]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[40]),
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[41], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[42], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*currentOpt, options, messageType*/ 26) {
    				each_value = /*options*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*_emailLabel*/ 256) set_data_dev(t5, /*_emailLabel*/ ctx[8]);

    			if (dirty[0] & /*_emailPlaceholder*/ 128) {
    				attr_dev(input2, "placeholder", /*_emailPlaceholder*/ ctx[7]);
    			}

    			if (dirty[0] & /*email*/ 64 && input2.value !== /*email*/ ctx[6]) {
    				set_input_value(input2, /*email*/ ctx[6]);
    			}

    			if (/*_emailHelp*/ ctx[9]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(label0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*_bodyLabel*/ 2048) set_data_dev(t9, /*_bodyLabel*/ ctx[11]);

    			if (dirty[0] & /*_bodyPlaceholder*/ 8192) {
    				attr_dev(textarea, "placeholder", /*_bodyPlaceholder*/ ctx[13]);
    			}

    			if (dirty[0] & /*body*/ 4) {
    				set_input_value(textarea, /*body*/ ctx[2]);
    			}

    			if (/*_bodyHelp*/ ctx[10]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(label1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*_submitButtonLabel*/ 16384) set_data_dev(t15, /*_submitButtonLabel*/ ctx[14]);

    			if (dirty[0] & /*canSubmitButton*/ 32768 && button1_disabled_value !== (button1_disabled_value = !/*canSubmitButton*/ ctx[15])) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(118:0) {#if showFeedbackDialog}",
    		ctx
    	});

    	return block;
    }

    // (127:8) {#each options as option}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*option*/ ctx[45].label + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[38](/*option*/ ctx[45]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			toggle_class(button, "current", /*currentOpt*/ ctx[4].messageType === /*option*/ ctx[45].messageType);
    			add_location(button, file, 127, 10, 3361);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*options*/ 2 && t_value !== (t_value = /*option*/ ctx[45].label + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*currentOpt, options*/ 18) {
    				toggle_class(button, "current", /*currentOpt*/ ctx[4].messageType === /*option*/ ctx[45].messageType);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(127:8) {#each options as option}",
    		ctx
    	});

    	return block;
    }

    // (140:8) {#if _emailHelp}
    function create_if_block_3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*_emailHelp*/ ctx[9]);
    			attr_dev(span, "class", "help");
    			add_location(span, file, 139, 24, 3859);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_emailHelp*/ 512) set_data_dev(t, /*_emailHelp*/ ctx[9]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(140:8) {#if _emailHelp}",
    		ctx
    	});

    	return block;
    }

    // (149:8) {#if _bodyHelp}
    function create_if_block_2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*_bodyHelp*/ ctx[10]);
    			attr_dev(span, "class", "help");
    			add_location(span, file, 148, 23, 4121);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_bodyHelp*/ 1024) set_data_dev(t, /*_bodyHelp*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(149:8) {#if _bodyHelp}",
    		ctx
    	});

    	return block;
    }

    // (161:0) {#if showingThanksMessage}
    function create_if_block(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*_thanksMessage*/ ctx[12]);
    			attr_dev(div, "class", "thanks-message feedback");
    			add_location(div, file, 161, 2, 4465);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_thanksMessage*/ 4096) set_data_dev(t, /*_thanksMessage*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(161:0) {#if showingThanksMessage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let button;
    	let t1;
    	let t2;
    	let if_block1_anchor;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showFeedbackDialog*/ ctx[0] && create_if_block_1(ctx);
    	let if_block1 = /*showingThanksMessage*/ ctx[5] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "help";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			this.c = noop;
    			add_location(button, file, 115, 0, 3081);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleClickHelpButton*/ ctx[17], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*showFeedbackDialog*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(t2.parentNode, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showingThanksMessage*/ ctx[5]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let currentOpt;
    	let _emailPlaceholder;
    	let _emailLabel;
    	let _emailHelp;
    	let _bodyHelp;
    	let _bodyLabel;
    	let _thanksMessage;
    	let _bodyPlaceholder;
    	let _submitButtonLabel;
    	let canSubmitButton;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("feedback-form", slots, []);
    	let { showFeedbackDialog = true } = $$props;
    	let { useHelpButton = false } = $$props;
    	let { callback = () => null } = $$props;
    	let { defaultApp = "drive-ui" } = $$props;
    	let { defaultEmail = "" } = $$props;
    	let { defaultBody = "" } = $$props;
    	let { defaultMessageType = "" } = $$props;
    	let { emailLabel = "Email Address" } = $$props;
    	let { emailPlaceholder = "name@provider" } = $$props;
    	let { emailHelp = "We'll only contact you about this feedback" } = $$props;
    	let { bodyLabel = "Message" } = $$props;
    	let { bodyHelp = "" } = $$props;
    	let { bodyPlaceholder = "" } = $$props;
    	let { submitButtonLabel = "" } = $$props;
    	let { thanksMessage = "Thanks for submitting your feedback!" } = $$props;

    	let { options = [
    		{ messageType: "general", label: "General" },
    		{
    			messageType: "bug-report",
    			label: "Report Issue",
    			submitButtonLabel: "Send Report",
    			bodyHelp: "Please include steps to reproduce the problem, your operating system, what happened, and what you expected to happen."
    		},
    		{
    			messageType: "feature-request",
    			label: "Request Feature",
    			submitButtonLabel: "Send Request",
    			bodyHelp: "What is the feature? Why is this feature needed?"
    		}
    	] } = $$props;

    	let { thanksMessageShowDuration = 1000 } = $$props;
    	let { transitionDuration = 250 } = $$props;

    	// Internal
    	let showingThanksMessage = false;

    	let app = defaultApp;
    	let email = defaultEmail;
    	let body = defaultBody;
    	let messageType = defaultMessageType;

    	// Functions
    	function handleClickHelpButton() {
    		$$invalidate(0, showFeedbackDialog = !showFeedbackDialog);
    	}

    	function resetForm() {
    		$$invalidate(2, body = "");
    	}

    	function close() {
    		$$invalidate(0, showFeedbackDialog = false);
    	}

    	function handlePressCancel() {
    		resetForm();
    		close();
    	}

    	function showThanksMessage() {
    		$$invalidate(5, showingThanksMessage = true);

    		setTimeout(
    			() => {
    				$$invalidate(5, showingThanksMessage = false);
    			},
    			thanksMessageShowDuration
    		);
    	}

    	function submitFeedback() {
    		const newFeedback = { type: messageType, body, email, app };
    		callback(newFeedback);
    		resetForm();
    		close();
    		showThanksMessage();
    	}

    	function handlePressSubmit() {
    		submitFeedback();
    	}

    	const writable_props = [
    		"showFeedbackDialog",
    		"useHelpButton",
    		"callback",
    		"defaultApp",
    		"defaultEmail",
    		"defaultBody",
    		"defaultMessageType",
    		"emailLabel",
    		"emailPlaceholder",
    		"emailHelp",
    		"bodyLabel",
    		"bodyHelp",
    		"bodyPlaceholder",
    		"submitButtonLabel",
    		"thanksMessage",
    		"options",
    		"thanksMessageShowDuration",
    		"transitionDuration"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<feedback-form> was created with unknown prop '${key}'`);
    	});

    	const click_handler = option => $$invalidate(3, messageType = option.messageType);

    	function input2_input_handler() {
    		email = this.value;
    		$$invalidate(6, email);
    	}

    	function textarea_input_handler() {
    		body = this.value;
    		$$invalidate(2, body);
    	}

    	const click_handler_1 = () => handlePressCancel();
    	const click_handler_2 = () => handlePressSubmit();

    	$$self.$$set = $$props => {
    		if ("showFeedbackDialog" in $$props) $$invalidate(0, showFeedbackDialog = $$props.showFeedbackDialog);
    		if ("useHelpButton" in $$props) $$invalidate(20, useHelpButton = $$props.useHelpButton);
    		if ("callback" in $$props) $$invalidate(21, callback = $$props.callback);
    		if ("defaultApp" in $$props) $$invalidate(22, defaultApp = $$props.defaultApp);
    		if ("defaultEmail" in $$props) $$invalidate(23, defaultEmail = $$props.defaultEmail);
    		if ("defaultBody" in $$props) $$invalidate(24, defaultBody = $$props.defaultBody);
    		if ("defaultMessageType" in $$props) $$invalidate(25, defaultMessageType = $$props.defaultMessageType);
    		if ("emailLabel" in $$props) $$invalidate(26, emailLabel = $$props.emailLabel);
    		if ("emailPlaceholder" in $$props) $$invalidate(27, emailPlaceholder = $$props.emailPlaceholder);
    		if ("emailHelp" in $$props) $$invalidate(28, emailHelp = $$props.emailHelp);
    		if ("bodyLabel" in $$props) $$invalidate(29, bodyLabel = $$props.bodyLabel);
    		if ("bodyHelp" in $$props) $$invalidate(30, bodyHelp = $$props.bodyHelp);
    		if ("bodyPlaceholder" in $$props) $$invalidate(31, bodyPlaceholder = $$props.bodyPlaceholder);
    		if ("submitButtonLabel" in $$props) $$invalidate(32, submitButtonLabel = $$props.submitButtonLabel);
    		if ("thanksMessage" in $$props) $$invalidate(33, thanksMessage = $$props.thanksMessage);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("thanksMessageShowDuration" in $$props) $$invalidate(34, thanksMessageShowDuration = $$props.thanksMessageShowDuration);
    		if ("transitionDuration" in $$props) $$invalidate(35, transitionDuration = $$props.transitionDuration);
    	};

    	$$self.$capture_state = () => ({
    		showFeedbackDialog,
    		useHelpButton,
    		callback,
    		defaultApp,
    		defaultEmail,
    		defaultBody,
    		defaultMessageType,
    		emailLabel,
    		emailPlaceholder,
    		emailHelp,
    		bodyLabel,
    		bodyHelp,
    		bodyPlaceholder,
    		submitButtonLabel,
    		thanksMessage,
    		options,
    		thanksMessageShowDuration,
    		transitionDuration,
    		showingThanksMessage,
    		app,
    		email,
    		body,
    		messageType,
    		handleClickHelpButton,
    		resetForm,
    		close,
    		handlePressCancel,
    		showThanksMessage,
    		submitFeedback,
    		handlePressSubmit,
    		currentOpt,
    		_emailPlaceholder,
    		_emailLabel,
    		_emailHelp,
    		_bodyHelp,
    		_bodyLabel,
    		_thanksMessage,
    		_bodyPlaceholder,
    		_submitButtonLabel,
    		canSubmitButton
    	});

    	$$self.$inject_state = $$props => {
    		if ("showFeedbackDialog" in $$props) $$invalidate(0, showFeedbackDialog = $$props.showFeedbackDialog);
    		if ("useHelpButton" in $$props) $$invalidate(20, useHelpButton = $$props.useHelpButton);
    		if ("callback" in $$props) $$invalidate(21, callback = $$props.callback);
    		if ("defaultApp" in $$props) $$invalidate(22, defaultApp = $$props.defaultApp);
    		if ("defaultEmail" in $$props) $$invalidate(23, defaultEmail = $$props.defaultEmail);
    		if ("defaultBody" in $$props) $$invalidate(24, defaultBody = $$props.defaultBody);
    		if ("defaultMessageType" in $$props) $$invalidate(25, defaultMessageType = $$props.defaultMessageType);
    		if ("emailLabel" in $$props) $$invalidate(26, emailLabel = $$props.emailLabel);
    		if ("emailPlaceholder" in $$props) $$invalidate(27, emailPlaceholder = $$props.emailPlaceholder);
    		if ("emailHelp" in $$props) $$invalidate(28, emailHelp = $$props.emailHelp);
    		if ("bodyLabel" in $$props) $$invalidate(29, bodyLabel = $$props.bodyLabel);
    		if ("bodyHelp" in $$props) $$invalidate(30, bodyHelp = $$props.bodyHelp);
    		if ("bodyPlaceholder" in $$props) $$invalidate(31, bodyPlaceholder = $$props.bodyPlaceholder);
    		if ("submitButtonLabel" in $$props) $$invalidate(32, submitButtonLabel = $$props.submitButtonLabel);
    		if ("thanksMessage" in $$props) $$invalidate(33, thanksMessage = $$props.thanksMessage);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("thanksMessageShowDuration" in $$props) $$invalidate(34, thanksMessageShowDuration = $$props.thanksMessageShowDuration);
    		if ("transitionDuration" in $$props) $$invalidate(35, transitionDuration = $$props.transitionDuration);
    		if ("showingThanksMessage" in $$props) $$invalidate(5, showingThanksMessage = $$props.showingThanksMessage);
    		if ("app" in $$props) $$invalidate(16, app = $$props.app);
    		if ("email" in $$props) $$invalidate(6, email = $$props.email);
    		if ("body" in $$props) $$invalidate(2, body = $$props.body);
    		if ("messageType" in $$props) $$invalidate(3, messageType = $$props.messageType);
    		if ("currentOpt" in $$props) $$invalidate(4, currentOpt = $$props.currentOpt);
    		if ("_emailPlaceholder" in $$props) $$invalidate(7, _emailPlaceholder = $$props._emailPlaceholder);
    		if ("_emailLabel" in $$props) $$invalidate(8, _emailLabel = $$props._emailLabel);
    		if ("_emailHelp" in $$props) $$invalidate(9, _emailHelp = $$props._emailHelp);
    		if ("_bodyHelp" in $$props) $$invalidate(10, _bodyHelp = $$props._bodyHelp);
    		if ("_bodyLabel" in $$props) $$invalidate(11, _bodyLabel = $$props._bodyLabel);
    		if ("_thanksMessage" in $$props) $$invalidate(12, _thanksMessage = $$props._thanksMessage);
    		if ("_bodyPlaceholder" in $$props) $$invalidate(13, _bodyPlaceholder = $$props._bodyPlaceholder);
    		if ("_submitButtonLabel" in $$props) $$invalidate(14, _submitButtonLabel = $$props._submitButtonLabel);
    		if ("canSubmitButton" in $$props) $$invalidate(15, canSubmitButton = $$props.canSubmitButton);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*options, messageType*/ 10) {
    			$$invalidate(4, currentOpt = options.find(opt => opt.messageType === messageType) || options[0]);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, emailPlaceholder*/ 134217744) {
    			$$invalidate(7, _emailPlaceholder = currentOpt.emailPlaceholder || emailPlaceholder || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, emailLabel*/ 67108880) {
    			$$invalidate(8, _emailLabel = currentOpt.emailLabel || emailLabel || "Email Address");
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, emailHelp*/ 268435472) {
    			$$invalidate(9, _emailHelp = currentOpt.emailHelp || emailHelp || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, bodyHelp*/ 1073741840) {
    			$$invalidate(10, _bodyHelp = currentOpt.bodyHelp || bodyHelp || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, bodyLabel*/ 536870928) {
    			$$invalidate(11, _bodyLabel = currentOpt.bodyLabel || bodyLabel || "Message");
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt*/ 16 | $$self.$$.dirty[1] & /*thanksMessage*/ 4) {
    			$$invalidate(12, _thanksMessage = currentOpt.thanksMessage || thanksMessage || "Thanks for your feedback!");
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt*/ 16 | $$self.$$.dirty[1] & /*bodyPlaceholder*/ 1) {
    			$$invalidate(13, _bodyPlaceholder = currentOpt.bodyPlaceholder || bodyPlaceholder || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt*/ 16 | $$self.$$.dirty[1] & /*submitButtonLabel*/ 2) {
    			$$invalidate(14, _submitButtonLabel = currentOpt.submitButtonLabel || submitButtonLabel || "Send Feedback");
    		}

    		if ($$self.$$.dirty[0] & /*body*/ 4) {
    			$$invalidate(15, canSubmitButton = body !== "");
    		}
    	};

    	return [
    		showFeedbackDialog,
    		options,
    		body,
    		messageType,
    		currentOpt,
    		showingThanksMessage,
    		email,
    		_emailPlaceholder,
    		_emailLabel,
    		_emailHelp,
    		_bodyHelp,
    		_bodyLabel,
    		_thanksMessage,
    		_bodyPlaceholder,
    		_submitButtonLabel,
    		canSubmitButton,
    		app,
    		handleClickHelpButton,
    		handlePressCancel,
    		handlePressSubmit,
    		useHelpButton,
    		callback,
    		defaultApp,
    		defaultEmail,
    		defaultBody,
    		defaultMessageType,
    		emailLabel,
    		emailPlaceholder,
    		emailHelp,
    		bodyLabel,
    		bodyHelp,
    		bodyPlaceholder,
    		submitButtonLabel,
    		thanksMessage,
    		thanksMessageShowDuration,
    		transitionDuration,
    		resetForm,
    		close,
    		click_handler,
    		input2_input_handler,
    		textarea_input_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.feedback{--_color-background:var(--color-background, #fff);--_color-border:var(--color-border, rgba(0,0,0,0.08));--_color-shadow:var(--color-shadow, rgba(0,0,0,0.1));--_color-highlight:var(--color-highlight, blue);--_color-body-text:var(--color-body-text, #000);--_color-body-text---muted:var(--color-body-text---muted, rgba(0, 0, 0, 0.7));--_shadow:var(--shadow, 0 0.125rem 0.25rem var(--_color-shadow));--_font-size:var(--font-size, 1em);--_control-margin:var(--control-margin, 0.25rem);--_control-padding:var(--control-padding, 0.25rem 0.5rem);--_control-border-radius:var(--control-border-radius, 0.25rem);--_control-background:var(--control-background, #ddd);--_control-text:var(--control-background, #000);--_control-border:var(--control-border, 0);--_control-background---current:var(--control-background, var(--_color-highlight));--_control-color---current:var(--control-background, #fff);--_control-border---current:var(--control-border, 0);--_control-background---current:var(--control-background, var(--_color-highlight));--_control-color---current:var(--control-background, #fff);--_control-border---current:var(--control-border, 0);--_field-background:var(--_field-background, var(--_color-background));--_field-border:var(--field-border, 1px solid var(--_color-border));--_field-color:var(--field-color, var(--_color-body-text));--_field-padding:var(--field-padding, var(--_control-padding));--_field-background---current:var(--_field-background---current, var(--_color-background));--_field-border---current:var(--field-border---current, 1px solid var(--_color-highlight));--_field-color---current:var(--field-color---current, var(--_color-body-text));--_form-shadow:var(--form-shadow, var(--_shadow));--_form-outer-spacing:var(--form-outer-spacing, 1rem);--_form-inner-spacing:var(--form-inner-spacing, 1rem);--_form-max-width:var(--form-max-width, 21em);--_form-border-radius:var(--form-border-radius, 0.5rem);--_form-background:var(--form-background, #fff);--_form-border:var(--form-border, 1px solid var(--_color-border));--_form-shadow:var(--form-shadow, 0 0.5rem 0.5rem var(--_color-shadow));--_form-font-family:var(--form-font-family, inherit);--_form-z-index:var(--form-z-index, 9999999);--_thanks-shadow:var(--thanks-shadow, var(--_shadow));--_thanks-font-family:var(--thanks-font-family, inherit);--_thanks-background:var(--thanks-background, var(--_color-background));--_thanks-color:var(--thanks-color, var(--_color-body-text));--_thanks-padding:var(--thanks-padding, 1rem);--_thanks-border-radius:var(--thanks-border-radius, 0.5rem)}@keyframes appear{from{opacity:0}to{opacity:1}}@keyframes disappear{from{opacity:0}to{opacity:1}}*{box-sizing:border-box}button.current{border:1px solid blue}.feedback-dialog,.thanks-message{position:fixed;top:50%;left:50%;transform:translate(-50%, -50%)}.feedback-dialog{z-index:var(--_form-z-index);box-shadow:var(--_form-shadow);font-family:var(--_form-font-family);border-radius:var(--_form-border-radius);border:var(--_form-border);width:var(--_form-max-width);padding:var(--_form-inner-spacing);animation:appear 1s both;display:flex;flex-direction:column;align-items:stretch;max-height:calc(100vh - (var(--_form-outer-spacing) / 2));max-width:calc(100vw - (var(--_form-outer-spacing) / 2))}.thanks-message{--background:#fff;background:var(--_thanks-background);box-shadow:var(--_thanks-shadow);font-family:var(--_thanks-font-family);padding:var(--_thanks-padding);border-radius:var(--_thanks-border-radius);width:max-content;max-width:90%}header{}footer{display:flex;justify-content:flex-end}footer button{margin-inline-start:0.5rem}h1{margin:0;padding:0 0 0.5rem;font-size:var(--_font-size)}.form{display:flex;flex-direction:column}label{display:flex;flex-direction:column;align-items:stretch;margin-top:0.5rem;margin-bottom:0.5rem}input,textarea{margin-top:0.125rem;margin-bottom:0.25rem;padding:var(--_field-padding);font:inherit;background:var(--_field-background);color:var(--_field-color);border:var(--_field-border)}label input:focus,label textarea:focus{background:var(--_field-background---current);color:var(--_field-color---current);border:var(--_field-border---current)}label span{font-size:var(--_font-size);margin-bottom:0.25rem}label .help{font-size:85%;color:var(--_color-body-text---muted)}input,textarea{border-radius:var(--_control-border-radius)}.type-picker{display:flex;flex-direction:row;flex-wrap:wrap;margin:-0.25rem;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--_color-border);margin-bottom:0.5rem}.type-picker button{margin:0.25rem}button{appearance:none;background:var(--_control-background);padding:var(--_control-padding);border-radius:var(--_control-border-radius);border:var(--_control-border)}button.current{background:var(--_control-background---current);border:var(--_control-border---current);color:var(--_control-color---current)}input,textarea{border:1px solid rgba(0,0,0,0.08);background:rgba(0,0,0,0.02);background-clip:padding-box;transition:border 0.1s ease}label .label{font-size:70%;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--_color-body-text---muted)}input:focus,textarea:focus{outline:none}button:hover{filter:brightness(110%)}.feedback-dialog{--color-highlight:#00b42b;--color-border:rgba(0,0,0,0.08)}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				showFeedbackDialog: 0,
    				useHelpButton: 20,
    				callback: 21,
    				defaultApp: 22,
    				defaultEmail: 23,
    				defaultBody: 24,
    				defaultMessageType: 25,
    				emailLabel: 26,
    				emailPlaceholder: 27,
    				emailHelp: 28,
    				bodyLabel: 29,
    				bodyHelp: 30,
    				bodyPlaceholder: 31,
    				submitButtonLabel: 32,
    				thanksMessage: 33,
    				options: 1,
    				thanksMessageShowDuration: 34,
    				transitionDuration: 35,
    				resetForm: 36,
    				close: 37
    			},
    			[-1, -1]
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return [
    			"showFeedbackDialog",
    			"useHelpButton",
    			"callback",
    			"defaultApp",
    			"defaultEmail",
    			"defaultBody",
    			"defaultMessageType",
    			"emailLabel",
    			"emailPlaceholder",
    			"emailHelp",
    			"bodyLabel",
    			"bodyHelp",
    			"bodyPlaceholder",
    			"submitButtonLabel",
    			"thanksMessage",
    			"options",
    			"thanksMessageShowDuration",
    			"transitionDuration",
    			"resetForm",
    			"close"
    		];
    	}

    	get showFeedbackDialog() {
    		return this.$$.ctx[0];
    	}

    	set showFeedbackDialog(showFeedbackDialog) {
    		this.$set({ showFeedbackDialog });
    		flush();
    	}

    	get useHelpButton() {
    		return this.$$.ctx[20];
    	}

    	set useHelpButton(useHelpButton) {
    		this.$set({ useHelpButton });
    		flush();
    	}

    	get callback() {
    		return this.$$.ctx[21];
    	}

    	set callback(callback) {
    		this.$set({ callback });
    		flush();
    	}

    	get defaultApp() {
    		return this.$$.ctx[22];
    	}

    	set defaultApp(defaultApp) {
    		this.$set({ defaultApp });
    		flush();
    	}

    	get defaultEmail() {
    		return this.$$.ctx[23];
    	}

    	set defaultEmail(defaultEmail) {
    		this.$set({ defaultEmail });
    		flush();
    	}

    	get defaultBody() {
    		return this.$$.ctx[24];
    	}

    	set defaultBody(defaultBody) {
    		this.$set({ defaultBody });
    		flush();
    	}

    	get defaultMessageType() {
    		return this.$$.ctx[25];
    	}

    	set defaultMessageType(defaultMessageType) {
    		this.$set({ defaultMessageType });
    		flush();
    	}

    	get emailLabel() {
    		return this.$$.ctx[26];
    	}

    	set emailLabel(emailLabel) {
    		this.$set({ emailLabel });
    		flush();
    	}

    	get emailPlaceholder() {
    		return this.$$.ctx[27];
    	}

    	set emailPlaceholder(emailPlaceholder) {
    		this.$set({ emailPlaceholder });
    		flush();
    	}

    	get emailHelp() {
    		return this.$$.ctx[28];
    	}

    	set emailHelp(emailHelp) {
    		this.$set({ emailHelp });
    		flush();
    	}

    	get bodyLabel() {
    		return this.$$.ctx[29];
    	}

    	set bodyLabel(bodyLabel) {
    		this.$set({ bodyLabel });
    		flush();
    	}

    	get bodyHelp() {
    		return this.$$.ctx[30];
    	}

    	set bodyHelp(bodyHelp) {
    		this.$set({ bodyHelp });
    		flush();
    	}

    	get bodyPlaceholder() {
    		return this.$$.ctx[31];
    	}

    	set bodyPlaceholder(bodyPlaceholder) {
    		this.$set({ bodyPlaceholder });
    		flush();
    	}

    	get submitButtonLabel() {
    		return this.$$.ctx[32];
    	}

    	set submitButtonLabel(submitButtonLabel) {
    		this.$set({ submitButtonLabel });
    		flush();
    	}

    	get thanksMessage() {
    		return this.$$.ctx[33];
    	}

    	set thanksMessage(thanksMessage) {
    		this.$set({ thanksMessage });
    		flush();
    	}

    	get options() {
    		return this.$$.ctx[1];
    	}

    	set options(options) {
    		this.$set({ options });
    		flush();
    	}

    	get thanksMessageShowDuration() {
    		return this.$$.ctx[34];
    	}

    	set thanksMessageShowDuration(thanksMessageShowDuration) {
    		this.$set({ thanksMessageShowDuration });
    		flush();
    	}

    	get transitionDuration() {
    		return this.$$.ctx[35];
    	}

    	set transitionDuration(transitionDuration) {
    		this.$set({ transitionDuration });
    		flush();
    	}

    	get resetForm() {
    		return this.$$.ctx[36];
    	}

    	set resetForm(value) {
    		throw new Error("<feedback-form>: Cannot set read-only property 'resetForm'");
    	}

    	get close() {
    		return this.$$.ctx[37];
    	}

    	set close(value) {
    		throw new Error("<feedback-form>: Cannot set read-only property 'close'");
    	}
    }

    customElements.define("feedback-form", App);

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
