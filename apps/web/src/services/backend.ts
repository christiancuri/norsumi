import type {
  AuthSession,
  Category,
  CreateCategoryBody,
  CreateLinkBody,
  CreateNoteBody,
  DeleteMeBody,
  Item,
  ItemListQuery,
  ItemListResponse,
  LibraryStats,
  LoginBody,
  RegisterBody,
  ServerInfo,
  UpdateCategoryBody,
  UpdateItemBody,
  UpdateMeBody,
  UploadFields,
  User,
} from '@norsumi/common';
/**
 * Everything the web app asks of the server. The HTTP implementation talks
 * to the real API; the mock one (VITE_MOCK=1) is an in-memory fake used for
 * development and screenshots. Never shipped in a normal build.
 */
export interface Backend {
  info(): Promise<ServerInfo>;
  auth: {
    login(body: LoginBody): Promise<AuthSession>;
    register(body: RegisterBody): Promise<AuthSession>;
    google(idToken: string): Promise<AuthSession>;
    logout(refreshToken: string): Promise<void>;
    me(): Promise<User>;
    updateMe(body: UpdateMeBody): Promise<User>;
    deleteMe(body: DeleteMeBody): Promise<void>;
  };
  categories: {
    list(): Promise<Category[]>;
    create(body: CreateCategoryBody): Promise<Category>;
    update(id: string, body: UpdateCategoryBody): Promise<Category>;
    remove(id: string): Promise<void>;
  };
  items: {
    list(query: ItemListQuery): Promise<ItemListResponse>;
    stats(): Promise<LibraryStats>;
    get(id: string): Promise<Item>;
    upload(file: File, fields?: UploadFields): Promise<Item>;
    createLink(body: CreateLinkBody): Promise<Item>;
    createNote(body: CreateNoteBody): Promise<Item>;
    update(id: string, body: UpdateItemBody): Promise<Item>;
    remove(id: string): Promise<void>;
    reprocess(id: string): Promise<Item>;
  };
}

let backend: Promise<Backend> | undefined;

export function getBackend(): Promise<Backend> {
  // Read the env var inline (not via `config`) so it is a literal at build
  // time and the mock chunk is dropped from normal builds.
  backend ??=
    import.meta.env.VITE_MOCK === '1'
      ? import('./mock/mock.backend').then((m) => m.mockBackend)
      : import('./http.backend').then((m) => m.httpBackend);
  return backend;
}
