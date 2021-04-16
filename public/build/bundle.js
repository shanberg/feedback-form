
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
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

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/App.svelte generated by Svelte v3.37.0 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i];
    	return child_ctx;
    }

    // (115:0) {#if showFeedbackDialog}
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
    	let label0;
    	let span0;
    	let t4;
    	let t5;
    	let input1;
    	let t6;
    	let t7;
    	let label1;
    	let span1;
    	let t8;
    	let t9;
    	let textarea;
    	let t10;
    	let t11;
    	let footer;
    	let button0;
    	let t13;
    	let button1;
    	let t14;
    	let button1_disabled_value;
    	let main_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*_emailHelp*/ ctx[10] && create_if_block_3(ctx);
    	let if_block1 = /*_bodyHelp*/ ctx[11] && create_if_block_2(ctx);

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
    			label0 = element("label");
    			span0 = element("span");
    			t4 = text(/*_emailLabel*/ ctx[9]);
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			if (if_block0) if_block0.c();
    			t7 = space();
    			label1 = element("label");
    			span1 = element("span");
    			t8 = text(/*_bodyLabel*/ ctx[12]);
    			t9 = space();
    			textarea = element("textarea");
    			t10 = space();
    			if (if_block1) if_block1.c();
    			t11 = space();
    			footer = element("footer");
    			button0 = element("button");
    			button0.textContent = "Cancel";
    			t13 = space();
    			button1 = element("button");
    			t14 = text(/*_submitButtonLabel*/ ctx[15]);
    			add_location(h1, file, 120, 6, 3143);
    			add_location(header, file, 119, 4, 3128);
    			attr_dev(div0, "class", "type-picker");
    			add_location(div0, file, 123, 6, 3204);
    			attr_dev(input0, "type", "hidden");
    			input0.value = /*app*/ ctx[17];
    			add_location(input0, file, 132, 6, 3503);
    			add_location(span0, file, 134, 9, 3561);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", /*_emailPlaceholder*/ ctx[8]);
    			add_location(input1, file, 135, 8, 3596);
    			add_location(label0, file, 133, 6, 3545);
    			add_location(span1, file, 139, 9, 3774);
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", /*_bodyPlaceholder*/ ctx[14]);
    			add_location(textarea, file, 140, 8, 3808);
    			add_location(label1, file, 138, 6, 3758);
    			add_location(button0, file, 148, 4, 4015);
    			button1.disabled = button1_disabled_value = !/*canSubmitButton*/ ctx[16];
    			attr_dev(button1, "messagetype", "submit");
    			add_location(button1, file, 149, 4, 4080);
    			add_location(footer, file, 147, 3, 4002);
    			attr_dev(div1, "class", "form");
    			add_location(div1, file, 122, 4, 3179);
    			attr_dev(main, "class", "feedback-dialog");
    			add_location(main, file, 115, 2, 3031);
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
    			append_dev(div1, label0);
    			append_dev(label0, span0);
    			append_dev(span0, t4);
    			append_dev(label0, t5);
    			append_dev(label0, input1);
    			set_input_value(input1, /*email*/ ctx[7]);
    			append_dev(label0, t6);
    			if (if_block0) if_block0.m(label0, null);
    			append_dev(div1, t7);
    			append_dev(div1, label1);
    			append_dev(label1, span1);
    			append_dev(span1, t8);
    			append_dev(label1, t9);
    			append_dev(label1, textarea);
    			set_input_value(textarea, /*body*/ ctx[3]);
    			append_dev(label1, t10);
    			if (if_block1) if_block1.m(label1, null);
    			append_dev(div1, t11);
    			append_dev(div1, footer);
    			append_dev(footer, button0);
    			append_dev(footer, t13);
    			append_dev(footer, button1);
    			append_dev(button1, t14);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[36]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[37]),
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[38], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[39], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*currentOpt, options, messageType*/ 50) {
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

    			if (!current || dirty[0] & /*_emailLabel*/ 512) set_data_dev(t4, /*_emailLabel*/ ctx[9]);

    			if (!current || dirty[0] & /*_emailPlaceholder*/ 256) {
    				attr_dev(input1, "placeholder", /*_emailPlaceholder*/ ctx[8]);
    			}

    			if (dirty[0] & /*email*/ 128 && input1.value !== /*email*/ ctx[7]) {
    				set_input_value(input1, /*email*/ ctx[7]);
    			}

    			if (/*_emailHelp*/ ctx[10]) {
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

    			if (!current || dirty[0] & /*_bodyLabel*/ 4096) set_data_dev(t8, /*_bodyLabel*/ ctx[12]);

    			if (!current || dirty[0] & /*_bodyPlaceholder*/ 16384) {
    				attr_dev(textarea, "placeholder", /*_bodyPlaceholder*/ ctx[14]);
    			}

    			if (dirty[0] & /*body*/ 8) {
    				set_input_value(textarea, /*body*/ ctx[3]);
    			}

    			if (/*_bodyHelp*/ ctx[11]) {
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

    			if (!current || dirty[0] & /*_submitButtonLabel*/ 32768) set_data_dev(t14, /*_submitButtonLabel*/ ctx[15]);

    			if (!current || dirty[0] & /*canSubmitButton*/ 65536 && button1_disabled_value !== (button1_disabled_value = !/*canSubmitButton*/ ctx[16])) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!main_transition) main_transition = create_bidirectional_transition(main, fade, { duration: /*transitionDuration*/ ctx[2] }, true);
    				main_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!main_transition) main_transition = create_bidirectional_transition(main, fade, { duration: /*transitionDuration*/ ctx[2] }, false);
    			main_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching && main_transition) main_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(115:0) {#if showFeedbackDialog}",
    		ctx
    	});

    	return block;
    }

    // (125:8) {#each options as option}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*option*/ ctx[44].label + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[35](/*option*/ ctx[44]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			toggle_class(button, "current", /*currentOpt*/ ctx[5].messageType === /*option*/ ctx[44].messageType);
    			add_location(button, file, 125, 10, 3274);
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
    			if (dirty[0] & /*options*/ 2 && t_value !== (t_value = /*option*/ ctx[44].label + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*currentOpt, options*/ 34) {
    				toggle_class(button, "current", /*currentOpt*/ ctx[5].messageType === /*option*/ ctx[44].messageType);
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
    		source: "(125:8) {#each options as option}",
    		ctx
    	});

    	return block;
    }

    // (137:8) {#if _emailHelp}
    function create_if_block_3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*_emailHelp*/ ctx[10]);
    			attr_dev(span, "class", "help");
    			add_location(span, file, 136, 24, 3693);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_emailHelp*/ 1024) set_data_dev(t, /*_emailHelp*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(137:8) {#if _emailHelp}",
    		ctx
    	});

    	return block;
    }

    // (146:8) {#if _bodyHelp}
    function create_if_block_2(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*_bodyHelp*/ ctx[11]);
    			attr_dev(span, "class", "help");
    			add_location(span, file, 145, 23, 3941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_bodyHelp*/ 2048) set_data_dev(t, /*_bodyHelp*/ ctx[11]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(146:8) {#if _bodyHelp}",
    		ctx
    	});

    	return block;
    }

    // (158:0) {#if showingThanksMessage}
    function create_if_block(ctx) {
    	let div;
    	let t;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*_thanksMessage*/ ctx[13]);
    			attr_dev(div, "class", "thanks-message");
    			add_location(div, file, 158, 2, 4285);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (!current || dirty[0] & /*_thanksMessage*/ 8192) set_data_dev(t, /*_thanksMessage*/ ctx[13]);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { duration: /*transitionDuration*/ ctx[2] }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { duration: /*transitionDuration*/ ctx[2] }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(158:0) {#if showingThanksMessage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let button;
    	let t1;
    	let t2;
    	let if_block1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showFeedbackDialog*/ ctx[0] && create_if_block_1(ctx);
    	let if_block1 = /*showingThanksMessage*/ ctx[6] && create_if_block(ctx);

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
    			add_location(button, file, 112, 0, 2948);
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
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleClickHelpButton*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*showFeedbackDialog*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*showFeedbackDialog*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t2.parentNode, t2);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*showingThanksMessage*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*showingThanksMessage*/ 64) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
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
    	let { showFeedbackDialog = false } = $$props;
    	let { callback = () => null } = $$props;
    	let { defaultApp = "drive-ui" } = $$props;
    	let { defaultEmail = "" } = $$props;
    	let { defaultBody = "" } = $$props;
    	let { defaultMessageType = "asdf" } = $$props;
    	let { emailLabel = "Email Address" } = $$props;
    	let { emailPlaceholder = "phil.lee@greymatter.io" } = $$props;
    	let { emailHelp = "probably includes an '@' symbol" } = $$props;
    	let { bodyLabel = "Message" } = $$props;
    	let { bodyHelp = "Please be helpful and considerate" } = $$props;
    	let { bodyPlaceholder = "Please add your cool message" } = $$props;
    	let { submitButtonLabel = "Submit Feedback" } = $$props;
    	let { thanksMessage = "Thanks for submitting your feedback!" } = $$props;

    	let { options = [
    		{ messageType: "general", label: "General" },
    		{
    			messageType: "bug-report",
    			label: "Report Issue",
    			bodyHelp: "Include any steps to reproduce"
    		},
    		{
    			messageType: "feature-request",
    			label: "Request Feature"
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
    		$$invalidate(3, body = "");
    	}

    	function closeDialog() {
    		$$invalidate(0, showFeedbackDialog = false);
    	}

    	function handlePressCancel() {
    		resetForm();
    		closeDialog();
    	}

    	function showThanksMessage() {
    		$$invalidate(6, showingThanksMessage = true);

    		setTimeout(
    			() => {
    				$$invalidate(6, showingThanksMessage = false);
    			},
    			thanksMessageShowDuration
    		);
    	}

    	function submitFeedback() {
    		const newFeedback = { type: messageType, body, email, app };
    		callback(newFeedback);
    		resetForm();
    		closeDialog();
    		showThanksMessage();
    	}

    	function handlePressSubmit() {
    		submitFeedback();
    	}

    	const writable_props = [
    		"showFeedbackDialog",
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

    	const click_handler = option => $$invalidate(4, messageType = option.messageType);

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(7, email);
    	}

    	function textarea_input_handler() {
    		body = this.value;
    		$$invalidate(3, body);
    	}

    	const click_handler_1 = () => handlePressCancel();
    	const click_handler_2 = () => handlePressSubmit();

    	$$self.$$set = $$props => {
    		if ("showFeedbackDialog" in $$props) $$invalidate(0, showFeedbackDialog = $$props.showFeedbackDialog);
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
    		if ("transitionDuration" in $$props) $$invalidate(2, transitionDuration = $$props.transitionDuration);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		showFeedbackDialog,
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
    		closeDialog,
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
    		if ("transitionDuration" in $$props) $$invalidate(2, transitionDuration = $$props.transitionDuration);
    		if ("showingThanksMessage" in $$props) $$invalidate(6, showingThanksMessage = $$props.showingThanksMessage);
    		if ("app" in $$props) $$invalidate(17, app = $$props.app);
    		if ("email" in $$props) $$invalidate(7, email = $$props.email);
    		if ("body" in $$props) $$invalidate(3, body = $$props.body);
    		if ("messageType" in $$props) $$invalidate(4, messageType = $$props.messageType);
    		if ("currentOpt" in $$props) $$invalidate(5, currentOpt = $$props.currentOpt);
    		if ("_emailPlaceholder" in $$props) $$invalidate(8, _emailPlaceholder = $$props._emailPlaceholder);
    		if ("_emailLabel" in $$props) $$invalidate(9, _emailLabel = $$props._emailLabel);
    		if ("_emailHelp" in $$props) $$invalidate(10, _emailHelp = $$props._emailHelp);
    		if ("_bodyHelp" in $$props) $$invalidate(11, _bodyHelp = $$props._bodyHelp);
    		if ("_bodyLabel" in $$props) $$invalidate(12, _bodyLabel = $$props._bodyLabel);
    		if ("_thanksMessage" in $$props) $$invalidate(13, _thanksMessage = $$props._thanksMessage);
    		if ("_bodyPlaceholder" in $$props) $$invalidate(14, _bodyPlaceholder = $$props._bodyPlaceholder);
    		if ("_submitButtonLabel" in $$props) $$invalidate(15, _submitButtonLabel = $$props._submitButtonLabel);
    		if ("canSubmitButton" in $$props) $$invalidate(16, canSubmitButton = $$props.canSubmitButton);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*options, messageType*/ 18) {
    			$$invalidate(5, currentOpt = options.find(opt => opt.messageType === messageType) || options[0]);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, emailPlaceholder*/ 134217760) {
    			$$invalidate(8, _emailPlaceholder = currentOpt.emailPlaceholder || emailPlaceholder || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, emailLabel*/ 67108896) {
    			$$invalidate(9, _emailLabel = currentOpt.emailLabel || emailLabel || "Email Address");
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, emailHelp*/ 268435488) {
    			$$invalidate(10, _emailHelp = currentOpt.emailHelp || emailHelp || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, bodyHelp*/ 1073741856) {
    			$$invalidate(11, _bodyHelp = currentOpt.bodyHelp || bodyHelp || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt, bodyLabel*/ 536870944) {
    			$$invalidate(12, _bodyLabel = currentOpt.bodyLabel || bodyLabel || "Message");
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt*/ 32 | $$self.$$.dirty[1] & /*thanksMessage*/ 4) {
    			$$invalidate(13, _thanksMessage = currentOpt.thanksMessage || thanksMessage || "Thanks for your feedback!");
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt*/ 32 | $$self.$$.dirty[1] & /*bodyPlaceholder*/ 1) {
    			$$invalidate(14, _bodyPlaceholder = currentOpt.bodyPlaceholder || bodyPlaceholder || undefined);
    		}

    		if ($$self.$$.dirty[0] & /*currentOpt*/ 32 | $$self.$$.dirty[1] & /*submitButtonLabel*/ 2) {
    			$$invalidate(15, _submitButtonLabel = currentOpt.submitButtonLabel || submitButtonLabel || "Submit Feedback");
    		}

    		if ($$self.$$.dirty[0] & /*body*/ 8) {
    			$$invalidate(16, canSubmitButton = body !== "");
    		}
    	};

    	return [
    		showFeedbackDialog,
    		options,
    		transitionDuration,
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
    		click_handler,
    		input1_input_handler,
    		textarea_input_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>@keyframes appear{from{opacity:0}to{opacity:1}}@keyframes disappear{from{opacity:0}to{opacity:1}}*{box-sizing:border-box}button.current{border:1px solid blue}.feedback-dialog,.thanks-message{position:fixed;top:50%;left:50%;transform:translate(-50%, -50%)}.thanks-message{--background:#fff}main{--_color-background:var(--color-background, #fff);--_color-border:var(--color-border, #eee);--_color-shadow:var(--color-shadow, #000);--_color-body-text:var(--color-body-text, #000);--_color-body-text---muted:var(--color-body-text---muted, rgba(0, 0, 0, 0.7));--_control-margin:var(--control-margin, 0.25rem);--_control-padding:var(--control-padding, 0.25rem 0.5rem);--_control-border-radius:var(--control-border-radius, 0.25rem);--_control-background:var(--control-background, #ddd);--_control-text:var(--control-background, #000);--_control-border:var(--control-border, 0);--_control-background---current:var(--control-background, #blue);--_control-color---current:var(--control-background, #fff);--_control-border---current:var(--control-border, 0);--_font-size:var(--font-size, 1rem);--_form-outer-spacing:var(--form-outer-spacing, 1rem);--_form-inner-spacing:var(--form-inner-spacing, 1rem);--_form-max-width:var(--form-max-width, 20em);--_form-border-radius:var(--form-border-radius, 0.5rem);--_form-background:var(--form-background, #fff);--_form-border:var(--form-border, 1px solid);--_form-font-family:var(--form-font-family, inherit);max-height:calc(100vh - (var(--_form-outer-spacing) / 2));max-width:calc(100vw - (var(--_form-outer-spacing) / 2));display:flex;flex-direction:column;align-items:stretch;font-family:var(--_form-font-family);border-radius:var(--_form-border-radius);border:var(--_form-border);max-width:var(--_form-max-width);padding:var(--_form-inner-spacing);animation:appear 1s both}header{}footer{display:flex;justify-content:flex-end}footer button{margin-inline-start:0.5rem}h1{margin:0;padding:0 0 0.5rem;font-size:var(--_font-size)}.form{display:flex;flex-direction:column;gap:1rem}label{display:flex;flex-direction:column;align-items:stretch}label input{margin-top:0.25rem;margin-bottom:0.25rem}label span{font-size:var(--_font-size);margin-bottom:0.25rem}label .help{font-size:85%;color:var(--_color-body-text---muted)}input,textarea{border-radius:var(--_control-border-radius);border:1px solid}.type-picker{display:flex;flex-direction:row;flex-wrap:wrap}.type-picker button{appearance:none;background:var(--_control-background);padding:var(--_control-padding);border-radius:var(--_control-border-radius);border:var(--_control-border)}.type-picker .current{background:blue;color:white}.type-picker button:hover{filter:brightness(110%)}</style>`;

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
    				transitionDuration: 2
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
    	}

    	get showFeedbackDialog() {
    		return this.$$.ctx[0];
    	}

    	set showFeedbackDialog(showFeedbackDialog) {
    		this.$set({ showFeedbackDialog });
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
    		return this.$$.ctx[2];
    	}

    	set transitionDuration(transitionDuration) {
    		this.$set({ transitionDuration });
    		flush();
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
