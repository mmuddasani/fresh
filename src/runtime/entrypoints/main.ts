import {
  ComponentChildren,
  ComponentType,
  Fragment,
  h,
  options,
  render,
  VNode,
} from "preact";
import { assetHashingHook } from "../utils.ts";
import { PartialSlot } from "$fresh/src/runtime/PartialSlot.tsx";

// Changing this to true makes debugging easier
const KEEP_COMMENTS = false;

function createRootFragment(
  parent: Element,
  replaceNode: Node | Node[],
  endMarker: Comment | Text,
) {
  replaceNode = ([] as Node[]).concat(replaceNode);
  console.log("Root", parent, replaceNode, endMarker);
  // @ts-ignore this is fine
  return parent.__k = {
    nodeType: 1,
    parentNode: parent,
    firstChild: replaceNode[0],
    childNodes: replaceNode,
    insertBefore(node: Node, child: Node | null) {
      parent.insertBefore(node, child ?? endMarker);
    },
    appendChild(child: Node) {
      // We cannot blindly call `.append()` as that would add
      // the new child to the very end of the parent node. This
      // leads to ordering issues when the multiple islands
      // share the same parent node.
      parent.insertBefore(child, endMarker);
    },
    removeChild(child: Node) {
      parent.removeChild(child);
    },
  };
}

function isCommentNode(node: Node): node is Comment {
  return node.nodeType === Node.COMMENT_NODE;
}
function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}
function isElementNode(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function revive(
  islands: Record<string, Record<string, ComponentType>>,
  // deno-lint-ignore no-explicit-any
  props: any[],
) {
  _walkInner(
    islands,
    props,
    // markerstack
    [],
    // Keep a root node in the vnode stack to save a couple of checks
    // later during iteration
    [h(Fragment, null)],
    document.body,
  );
}

function ServerComponent(
  props: { children: ComponentChildren },
): ComponentChildren {
  return props.children;
}
ServerComponent.displayName = "PreactServerComponent";

function addPropsChild(parent: VNode, vnode: ComponentChildren) {
  const props = parent.props;
  if (props.children === null) {
    props.children = vnode;
  } else {
    if (!Array.isArray(props.children)) {
      props.children = [props.children, vnode];
    } else {
      props.children.push(vnode);
    }
  }
}

const partials = new Map<string, [Comment | null, Comment | null]>();

const enum MarkerKind {
  Island,
  Slot,
  Partial,
}

interface Marker {
  kind: MarkerKind;
  // We can remove this once we drop support for RTS <6.1.0 where
  // we rendered incorrect comments leading to `!--` and `--` being
  // included in the comment text. Therefore this is a normalized
  // string representing the actual intended comment value which makes
  // a bunch of stuff easier.
  text: string;
  startNode: Comment | null;
  endNode: Comment | null;
}

function replaceWithText(node: Node | Comment) {
  const text = new Text("");
  node.parentNode!.insertBefore(text, node);
  node.parentNode!.removeChild(node);
  return text;
}

/**
 * Hide `<--frsh-* -->` comment nodes, so that it doesn't confuse users
 * in browser DevTools. We still need markers to function though, so we
 * simply replace comment markers with empty Text nodes which are invisible
 * in DevTools. We need markers because multiple islands, slots or partials
 * can share the same parent node.
 */
function hideMarkers(marker: Marker, sib: Node): Node | null {
  const next = sib.nextSibling;

  if (marker.startNode) {
    const text = replaceWithText(marker.startNode);
    marker.startNode = text;
  }

  if (marker.endNode) {
    const text = replaceWithText(marker.endNode);
    marker.endNode = text;
  }

  return next;
}

/**
 * Revive islands and stich together any server rendered content.
 *
 * Conceptually we're doing an inorder depth first search over the DOM
 * to find all our comment nodes `<!--frsh-something-->` which act as
 * a marker for islands or server rendered JSX (=slots in islands).
 * Every island or server JSX has a start and an end marker, which
 * means there is no _single_ root nodes for these elements.
 * The hierarchy we need to construct for the virtual-dom tree might
 * be rendered in a flattened manner in the DOM.
 *
 * Example:
 *   <div>
 *     <!--frsh-island:0-->
 *     <!--frsh-slot:children-->
 *     <p>server content</p>
 *     <!--/frsh-slot:children-->
 *     <!--/frsh-island:0-->
 *   </div>
 *
 * Here we have a flat DOM structure, but from the virtual-dom
 * perspective we should render:
 *   <div> -> <Island> -> ServerComponent -> <p>server content</p>
 *
 * To solve this we're keeping track of the virtual-dom hierarchy
 * in a stack-like manner, but do the actual iteration in a list-based
 * fashion over an HTMLElement's children list.
 */
function _walkInner(
  islands: Record<string, Record<string, ComponentType>>,
  // deno-lint-ignore no-explicit-any
  props: any[],
  markerStack: Marker[],
  vnodeStack: VNode[],
  node: Node | Comment,
) {
  let sib: Node | null = node;
  while (sib !== null) {
    const marker = markerStack.length > 0
      ? markerStack[markerStack.length - 1]
      : null;

    // We use comment nodes to mark Fresh islands and slots
    if (isCommentNode(sib)) {
      let comment = sib.data;
      if (comment.startsWith("!--")) {
        comment = comment.slice(3, -2);
      }

      console.log("COMMENT", comment);

      if (comment.startsWith("frsh-slot")) {
        // Note: Nested slots are not possible as they're flattened
        // already on the server.
        markerStack.push({
          startNode: sib,
          text: comment,
          endNode: null,
          kind: MarkerKind.Slot,
        });
        // @ts-ignore TS gets confused
        vnodeStack.push(h(ServerComponent, { key: comment }));
      } else if (comment.startsWith("frsh-partial")) {
        const name = comment.slice("frsh-partial:".length);
        const node = KEEP_COMMENTS ? sib : replaceWithText(sib);
        sib = node;
        partials.set(name, [node, node]);
        console.log("partial", name, sib);
      } else if (comment.startsWith("/frsh-partial")) {
        const name = comment.slice("/frsh-partial:".length);
        const state = partials.get(name);
        const node = sib = KEEP_COMMENTS ? sib : replaceWithText(sib);
        if (state) state[1] = node;
        sib = node;
        console.log(partials, name, sib);
      } else if (
        marker !== null && (
          comment.startsWith("/frsh") ||
          // Check for old Preact RTS
          marker.text === comment
        )
      ) {
        // We're closing either a slot or an island
        marker.endNode = sib;

        markerStack.pop();
        const parent = markerStack.length > 0
          ? markerStack[markerStack.length - 1]
          : null;

        if (marker.kind === MarkerKind.Slot) {
          // If we're closing a slot than it's assumed that we're
          // inside an island
          if (parent?.kind === MarkerKind.Island) {
            const vnode = vnodeStack.pop();

            // For now only `props.children` is supported.
            const islandParent = vnodeStack[vnodeStack.length - 1]!;
            // Overwrite serialized `{__slot: "children"}` with the
            // actual vnode child.
            islandParent.props.children = vnode;
          }

          // Remove markers
          if (!KEEP_COMMENTS) {
            sib = hideMarkers(marker, sib);
          }
          continue;
        } else if (marker.kind === MarkerKind.Island) {
          // We're ready to revive this island if it has
          // no roots of its own. Otherwise we'll treat it
          // as a standard component
          if (markerStack.length === 0) {
            const children: Node[] = [];

            let child: Node | null = marker.startNode;
            while (
              (child = child!.nextSibling) !== null && child !== marker.endNode
            ) {
              children.push(child);
            }

            const vnode = vnodeStack[vnodeStack.length - 1];

            if (vnode.props.children == null) {
              const [id, exportName, n] = comment.slice("/frsh-".length).split(
                ":",
              );

              const sel = `#frsh-slot-${id}-${exportName}-${n}-children`;
              const template = document.querySelector(sel) as
                | HTMLTemplateElement
                | null;

              if (template !== null) {
                markerStack.push({
                  kind: MarkerKind.Slot,
                  endNode: null,
                  startNode: null,
                  text: "foo",
                });

                const node = template.content.cloneNode(true);
                _walkInner(
                  islands,
                  props,
                  markerStack,
                  vnodeStack,
                  node,
                );

                markerStack.pop();
              }
            }
            vnodeStack.pop();

            const parentNode = sib.parentNode! as HTMLElement;

            if (!KEEP_COMMENTS) {
              sib = hideMarkers(marker, sib);
            }
            console.log("af sib", sib);

            const endMarker = marker.endNode;

            const _render = () =>
              render(
                vnode,
                createRootFragment(
                  parentNode,
                  children,
                  endMarker,
                  // deno-lint-ignore no-explicit-any
                ) as any as HTMLElement,
              );

            "scheduler" in window
              // `scheduler.postTask` is async but that can easily
              // fire in the background. We don't want waiting for
              // the hydration of an island block us.
              // @ts-ignore scheduler API is not in types yet
              ? scheduler!.postTask(_render)
              : setTimeout(_render, 0);

            continue;
          } else if (parent?.kind === MarkerKind.Slot) {
            // Treat the island as a standard component when it
            // has an island parent or a slot parent
            const vnode = vnodeStack.pop();
            const parent = vnodeStack[vnodeStack.length - 1]!;
            addPropsChild(parent, vnode);
          }
        }
      } else if (comment.startsWith("frsh")) {
        // We're opening a new island
        const [id, exportName, n] = comment.slice(5).split(":");
        const islandProps = props[Number(n)];

        markerStack.push({
          startNode: sib,
          endNode: null,
          text: comment,
          kind: MarkerKind.Island,
        });
        const vnode = h(islands[id][exportName], islandProps);
        vnodeStack.push(vnode);
      }
    } else if (isTextNode(sib)) {
      const parentVNode = vnodeStack[vnodeStack.length - 1]!;
      if (
        marker !== null && marker.kind === MarkerKind.Slot
      ) {
        addPropsChild(parentVNode, sib.data);
      }
    } else {
      const parentVNode = vnodeStack[vnodeStack.length - 1];
      if (
        marker !== null &&
        marker.kind === MarkerKind.Slot && isElementNode(sib)
      ) {
        // Parse the server rendered DOM into vnodes that we can
        // attach to the virtual-dom tree. In the future, once
        // Preact supports a way to skip over subtrees, this
        // can be dropped.
        const childLen = sib.childNodes.length;
        const props: Record<string, unknown> = {
          children: childLen <= 1 ? null : [],
        };
        for (let i = 0; i < sib.attributes.length; i++) {
          const attr = sib.attributes[i];

          // Boolean attributes are always `true` when present.
          // See: https://developer.mozilla.org/en-US/docs/Glossary/Boolean/HTML
          props[attr.nodeName] =
            // deno-lint-ignore no-explicit-any
            typeof (sib as any)[attr.nodeName] === "boolean"
              ? true
              : attr.nodeValue;
        }
        const vnode = h(sib.localName, props);
        addPropsChild(parentVNode, vnode);
        vnodeStack.push(vnode);
      }

      // TODO: What about script tags?
      if (
        sib.firstChild && (sib.nodeName !== "SCRIPT")
      ) {
        _walkInner(islands, props, markerStack, vnodeStack, sib.firstChild);
      }

      // Pop vnode if current marker is a slot or we are an island marker
      // that was created inside another island
      if (
        marker !== null &&
        (marker.kind === MarkerKind.Slot ||
          markerStack.length > 1 &&
            markerStack[markerStack.length - 2].kind === MarkerKind.Island)
      ) {
        vnodeStack.pop();
      }
    }

    sib = sib.nextSibling;
  }
}

const originalHook = options.vnode;
options.vnode = (vnode) => {
  assetHashingHook(vnode);
  if (originalHook) originalHook(vnode);
};

// Keep track of history state to apply forward or backward animations
let index = history.state?.index || 0;
if (!history.state) {
  history.replaceState({ index }, document.title);
}

document.addEventListener("click", async (e) => {
  let el = e.target;
  if (el && el instanceof HTMLElement) {
    // Check if we clicked inside an anchor link
    if (el.nodeName !== "A") {
      el = el.closest("a");
    }

    if (
      // Check that we're still dealing with an anchor tag
      el && el instanceof HTMLAnchorElement &&
      // Check if it's an internal link
      el.href && (!el.target || el.target === "_self") &&
      el.origin === location.origin &&
      // Check if it was a left click and not a right click
      e.button === 0 &&
      // Check that the user doesn't press a key combo to open the
      // link in a new tab or something
      !(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button) &&
      // Check that the event isn't aborted already
      !e.defaultPrevented
    ) {
      const partial = el.getAttribute("fh-partial");

      if (partial) {
        e.preventDefault();
        index++;
        history.pushState({ index }, "", el.href);

        const res = await fetch(partial);
        const text = await res.text();
        const doc2 = new DOMParser().parseFromString(text, "text/html");

        console.log(doc2);
        const ctx: PartialWalkCtx = {
          partials: new Map(),
          stack: [],
        };
        walk(doc2.body, ctx);

        // TODO: Wire into vnode
        // Inject partials into active page
        ctx.partials.forEach((value, key) => {
          const current = partials.get(key);
          if (!current) {
            console.error(`Unknown partial: ${key}`);
            return;
          } else if (current[0] === null || current[1] === null) {
            console.error(`Missing partial boundary for "${key}":`, current);
            return;
          }

          // TODO: Unmount islands
          // TODO: DOM diff?
          // Delete old nodes
          const start = current[0];
          let item = start.nextSibling;
          const end = current[1];
          while (item !== null && item !== end) {
            const node = item;
            item = item.nextSibling;
            node.remove();
          }

          // Insert new nodes
          const insertStart = value[0];
          item = insertStart.nextSibling;
          const insertEnd = value[1];
          const parent = start.parentNode!;
          while (item !== null && item !== insertEnd) {
            const next = item.nextSibling;
            parent.insertBefore(item, end);
            item = next;
          }

          console.log(key, value, current);
        });
        console.log(ctx);
      }
    }
  }
});

const enum PartialWalkKind {
  PARTIAL,
}

interface PartialWalkCtx {
  partials: Map<string, [Comment, Comment]>;
  stack: PartialWalkKind[];
}

export function initPartials() {
  const ctx: PartialWalkCtx = {
    partials: new Map(),
    stack: [],
  };
  console.log("init partials");
  walk(document.body, ctx);
  console.log(ctx);
}

function walk(node: HTMLElement | Text | Comment, ctx: PartialWalkCtx) {
  if (node.nodeType === Node.TEXT_NODE) {
    return;
  } else if (isCommentNode(node)) {
    if (node.data.startsWith("frsh-partial")) {
      const [_, name] = node.data.split(":");
      ctx.partials.set(name, [node, node]);
    } else if (node.data.startsWith("/frsh-partial")) {
      const [_, name] = node.data.split(":");
      const state = ctx.partials.get(name);
      if (state) state[1] = node;
    }
  } else {
    for (let i = 0; i < node.childNodes.length; i++) {
      // deno-lint-ignore no-explicit-any
      const child = node.childNodes[i] as any;
      walk(child, ctx);
    }
  }
}
