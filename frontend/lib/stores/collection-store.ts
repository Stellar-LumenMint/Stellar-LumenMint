import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { CollectionStore, Collection, NFT } from "./types";
import { API_CONFIG } from "../config";
import { getCookie } from "../CSRFTOKEN";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { AppApiError, normalizeApiError } from "@/utils/fetchUtils";

const initialState = {
  collections: [],
  userCollections: [],
  currentCollection: null,
  nfts: [],
  userNFTs: [],
  loading: {
    collections: false,
    userCollections: false,
    nfts: false,
    userNFTs: false,
    creating: false,
    updating: false,
  },
  error: null as AppApiError | null,
  pagination: {
    collections: {
      page: 1,
      limit: 12,
      total: 0,
      hasMore: false,
    },
    nfts: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false,
    },
  },
};

export const useCollectionStore = create<any>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Collection actions
      setCollections: (collections: Collection[]) =>
        set((state: any) => {
          state.collections = collections;
        }),

      addCollection: (collection: Collection) =>
        set((state: any) => {
          state.collections.unshift(collection);
          state.userCollections.unshift(collection);
        }),

      updateCollection: (id: string | number, updates: Partial<Collection>) =>
        set((state: any) => {
          const index = state.collections.findIndex((c: any) => c.id === id);
          if (index !== -1) {
            state.collections[index] = {
              ...state.collections[index],
              ...updates,
            };
          }

          const userIndex = state.userCollections.findIndex(
            (c: any) => c.id === id,
          );
          if (userIndex !== -1) {
            state.userCollections[userIndex] = {
              ...state.userCollections[userIndex],
              ...updates,
            };
          }

          if (state.currentCollection?.id === id) {
            state.currentCollection = {
              ...state.currentCollection,
              ...updates,
            };
          }
        }),

      removeCollection: (id: string | number) =>
        set((state: any) => {
          state.collections = state.collections.filter((c: any) => c.id !== id);
          state.userCollections = state.userCollections.filter(
            (c: any) => c.id !== id,
          );
          if (state.currentCollection?.id === id) {
            state.currentCollection = null;
          }
        }),

      setCurrentCollection: (collection: Collection | null) =>
        set((state: any) => {
          state.currentCollection = collection;
        }),

      // User collections
      setUserCollections: (collections: Collection[]) =>
        set((state: any) => {
          state.userCollections = collections;
        }),

      // NFT actions
      setNFTs: (nfts: NFT[]) =>
        set((state: any) => {
          state.nfts = nfts;
        }),

      addNFT: (nft: NFT) =>
        set((state: any) => {
          state.nfts.unshift(nft);
          state.userNFTs.unshift(nft);
        }),

      updateNFT: (id: string, updates: Partial<NFT>) =>
        set((state: any) => {
          const index = state.nfts.findIndex((n: any) => n.id === id);
          if (index !== -1) {
            state.nfts[index] = { ...state.nfts[index], ...updates };
          }

          const userIndex = state.userNFTs.findIndex((n: any) => n.id === id);
          if (userIndex !== -1) {
            state.userNFTs[userIndex] = {
              ...state.userNFTs[userIndex],
              ...updates,
            };
          }
        }),

      removeNFT: (id: string) =>
        set((state: any) => {
          state.nfts = state.nfts.filter((n: any) => n.id !== id);
          state.userNFTs = state.userNFTs.filter((n: any) => n.id !== id);
        }),

      setUserNFTs: (nfts: NFT[]) =>
        set((state: any) => {
          state.userNFTs = nfts;
        }),

      // Loading states
      setLoading: (key: string, loading: boolean) =>
        set((state: any) => {
          state.loading[key] = loading;
        }),

      // Error handling
      setError: (error: AppApiError | null) =>
        set((state: any) => {
          state.error = error;
        }),

      clearError: () =>
        set((state: any) => {
          state.error = null;
        }),

      // Pagination
      setPagination: (type: string, pagination: any) =>
        set((state: any) => {
          state.pagination[type] = { ...state.pagination[type], ...pagination };
        }),

      // API actions routed via standardized fetch wrapper
      fetchCollections: async () => {
        const { setLoading, setError, setCollections, setPagination } = get();

        try {
          setLoading("collections", true);
          setError(null);

          const { page, limit } = get().pagination.collections;
          const response = await fetchWithAuth(
            `${API_CONFIG.baseUrl}/collections?page=${page}&limit=${limit}`,
            {
              method: "GET",
              credentials: "include",
            },
          );

          const data = await response.json();

          if (Array.isArray(data)) {
            setCollections(data);
          } else if (data.collections) {
            setCollections(data.collections);
            setPagination("collections", {
              total: data.total || data.collections.length,
              hasMore: data.hasMore || false,
            });
          }
        } catch (error) {
          const normalized = await normalizeApiError(error);
          setError(normalized);
          console.error("Error fetching collections:", normalized);
        } finally {
          setLoading("collections", false);
        }
      },

      fetchUserCollections: async () => {
        const { setLoading, setError, setUserCollections } = get();

        try {
          setLoading("userCollections", true);
          setError(null);

          const csrfToken = await getCookie();
          const response = await fetchWithAuth(
            `${API_CONFIG.baseUrl}/collections/user`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
            },
          );

          const data = await response.json();
          setUserCollections(
            Array.isArray(data) ? data : data.collections || [],
          );
        } catch (error) {
          const normalized = await normalizeApiError(error);
          setError(normalized);
          console.error("Error fetching user collections:", normalized);
        } finally {
          setLoading("userCollections", false);
        }
      },

      fetchNFTs: async (collectionId?: string) => {
        const { setLoading, setError, setNFTs, setPagination } = get();

        try {
          setLoading("nfts", true);
          setError(null);

          const { page, limit } = get().pagination.nfts;
          let url = `${API_CONFIG.baseUrl}/nfts?page=${page}&limit=${limit}`;

          if (collectionId) {
            url += `&collectionId=${collectionId}`;
          }

          const response = await fetchWithAuth(url, {
            method: "GET",
            credentials: "include",
          });

          const data = await response.json();

          if (Array.isArray(data)) {
            setNFTs(data);
          } else if (data.nfts) {
            setNFTs(data.nfts);
            setPagination("nfts", {
              total: data.total || data.nfts.length,
              hasMore: data.hasMore || false,
            });
          }
        } catch (error) {
          const normalized = await normalizeApiError(error);
          setError(normalized);
          console.error("Error fetching NFTs:", normalized);
        } finally {
          setLoading("nfts", false);
        }
      },

      fetchUserNFTs: async () => {
        const { setLoading, setError, setUserNFTs } = get();

        try {
          setLoading("userNFTs", true);
          setError(null);

          const csrfToken = await getCookie();
          const response = await fetchWithAuth(
            `${API_CONFIG.baseUrl}/nfts/user`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
            },
          );

          const data = await response.json();
          setUserNFTs(Array.isArray(data) ? data : data.nfts || []);
        } catch (error) {
          const normalized = await normalizeApiError(error);
          setError(normalized);
          console.error("Error fetching user NFTs:", normalized);
        } finally {
          setLoading("userNFTs", false);
        }
      },

      createCollection: async (collectionData: any) => {
        const { setLoading, setError, addCollection } = get();

        try {
          setLoading("creating", true);
          setError(null);

          const csrfToken = await getCookie();
          const response = await fetchWithAuth(
            `${API_CONFIG.baseUrl}/collections`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken,
              },
              body: JSON.stringify({
                ...collectionData,
                createdAt: new Date().toISOString(),
              }),
            },
          );

          const newCollection = await response.json();
          addCollection(newCollection);
          return newCollection;
        } catch (error) {
          const normalized = await normalizeApiError(error);
          setError(normalized);
          throw normalized;
        } finally {
          setLoading("creating", false);
        }
      },

      createNFT: async (nftData: any) => {
        const { setLoading, setError, addNFT } = get();

        try {
          setLoading("creating", true);
          setError(null);

          const csrfToken = await getCookie();
          const response = await fetchWithAuth(`${API_CONFIG.baseUrl}/nfts`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({
              ...nftData,
              createdAt: new Date().toISOString(),
            }),
          });

          const newNFT = await response.json();
          addNFT(newNFT);
          return newNFT;
        } catch (error) {
          const normalized = await normalizeApiError(error);
          setError(normalized);
          throw normalized;
        } finally {
          setLoading("creating", false);
        }
      },
    })),
    {
      name: "collection-store",
    },
  ),
);

// Hook for easier collection state access
export const useCollections = () => {
  const {
    collections,
    userCollections,
    currentCollection,
    nfts,
    userNFTs,
    loading,
    error,
    pagination,
    fetchCollections,
    fetchUserCollections,
    fetchNFTs,
    fetchUserNFTs,
    createCollection,
    createNFT,
    setCurrentCollection,
    clearError,
  } = useCollectionStore();

  return {
    collections,
    userCollections,
    currentCollection,
    nfts,
    userNFTs,
    loading,
    error,
    pagination,
    fetchCollections,
    fetchUserCollections,
    fetchNFTs,
    fetchUserNFTs,
    createCollection,
    createNFT,
    setCurrentCollection,
    clearError,
  };
};
