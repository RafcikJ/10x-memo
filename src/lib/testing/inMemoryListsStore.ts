import type { GeneratedListItem, ListItemEntity, ListSource, ListWithItemsDTO, NounCategory } from "@/types";
import { randomUUID } from "node:crypto";

/**
 * Testing-mode only in-memory store to make Playwright E2E deterministic.
 *
 * Why:
 * - E2E runs with mocked auth (`DISABLE_AUTH_FOR_TESTING=true`)
 * - Local Supabase may not be running/migrated, which breaks pages that read/write `lists`
 *
 * Scope:
 * - Used ONLY when `import.meta.env.DEV && DISABLE_AUTH_FOR_TESTING === "true"`
 * - Not a production persistence layer
 */

export function isTestingMode(): boolean {
  return import.meta.env.DEV && process.env.DISABLE_AUTH_FOR_TESTING === "true";
}

type StoredList = ListWithItemsDTO;

const store = {
  listsById: new Map<string, StoredList>(),
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeDisplay(display: string) {
  // Keep it simple (DB trigger does more, but UI/tests don't rely on it)
  return display.trim().toLowerCase();
}

function assertTestingMode() {
  if (!isTestingMode()) {
    throw new Error("[InMemoryListsStore] This store is only available in testing mode.");
  }
}

export function createListWithItems(args: {
  userId: string;
  name: string;
  source: ListSource;
  category: NounCategory | null | undefined;
  items: GeneratedListItem[];
}): ListWithItemsDTO {
  assertTestingMode();

  const ts = nowIso();
  const listId = randomUUID();

  const list: ListWithItemsDTO = {
    id: listId,
    user_id: args.userId,
    name: args.name.trim(),
    source: args.source,
    category: args.category ?? null,
    story: null,
    first_tested_at: null,
    last_score: null,
    last_tested_at: null,
    last_correct: null,
    last_wrong: null,
    last_accessed_at: ts,
    created_at: ts,
    updated_at: ts,
    items: args.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((it) => {
        const item: ListItemEntity = {
          id: randomUUID(),
          list_id: listId,
          position: it.position,
          display: it.display.trim(),
          normalized: normalizeDisplay(it.display),
          created_at: ts,
        };
        return item;
      }),
  };

  store.listsById.set(listId, list);
  return list;
}

export function getListsByUser(userId: string): ListWithItemsDTO[] {
  assertTestingMode();

  return Array.from(store.listsById.values())
    .filter((l) => l.user_id === userId)
    .sort((a, b) => {
      const aTs = a.last_accessed_at ?? a.created_at;
      const bTs = b.last_accessed_at ?? b.created_at;
      return bTs.localeCompare(aTs);
    });
}

export function getListById(args: { userId: string; listId: string }): ListWithItemsDTO | null {
  assertTestingMode();

  const list = store.listsById.get(args.listId);
  if (!list) return null;
  if (list.user_id !== args.userId) return null;
  return list;
}

export function updateListName(args: { userId: string; listId: string; name: string }): ListWithItemsDTO | null {
  assertTestingMode();

  const list = getListById({ userId: args.userId, listId: args.listId });
  if (!list) return null;

  const updated: ListWithItemsDTO = { ...list, name: args.name.trim(), updated_at: nowIso() };
  store.listsById.set(args.listId, updated);
  return updated;
}

export function deleteList(args: { userId: string; listId: string }): boolean {
  assertTestingMode();

  const list = getListById({ userId: args.userId, listId: args.listId });
  if (!list) return false;
  store.listsById.delete(args.listId);
  return true;
}

export function updateItemDisplay(args: {
  userId: string;
  listId: string;
  itemId: string;
  display: string;
}): ListItemEntity | null {
  assertTestingMode();

  const list = getListById({ userId: args.userId, listId: args.listId });
  if (!list) return null;
  if (list.first_tested_at) return null;

  const idx = list.items.findIndex((i) => i.id === args.itemId);
  if (idx === -1) return null;

  const ts = nowIso();
  const updatedItem: ListItemEntity = {
    ...list.items[idx],
    display: args.display.trim(),
    normalized: normalizeDisplay(args.display),
  };

  const updatedList: ListWithItemsDTO = {
    ...list,
    updated_at: ts,
    items: list.items.map((it, i) => (i === idx ? updatedItem : it)),
  };

  store.listsById.set(args.listId, updatedList);
  return updatedItem;
}

export function deleteItem(args: { userId: string; listId: string; itemId: string }): boolean {
  assertTestingMode();

  const list = getListById({ userId: args.userId, listId: args.listId });
  if (!list) return false;
  if (list.first_tested_at) return false;

  const filtered = list.items.filter((it) => it.id !== args.itemId);
  if (filtered.length === list.items.length) return false;

  // Reindex positions 1..N
  const reindexed = filtered
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((it, idx) => ({ ...it, position: idx + 1 }));

  const updated: ListWithItemsDTO = { ...list, items: reindexed, updated_at: nowIso() };
  store.listsById.set(args.listId, updated);
  return true;
}
