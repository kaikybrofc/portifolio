import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Search, Server } from "lucide-react";
import { NeonBox, NeonText } from "@/components/NeonGlow";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  buildOmnizapMediaProxyUrl,
  fetchOmnizapRemoteDataFiles,
  fetchOmnizapRemoteOrphanStickers,
  fetchOmnizapRemotePackByKey,
  fetchOmnizapRemoteStickerPacks,
  fetchOmnizapWsStatus,
} from "@/lib/omnizapWebhookApi";

const DATA_FILES_PAGE_SIZE = 42;
const PACKS_PAGE_SIZE = 24;
const ORPHANS_PAGE_SIZE = 30;

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const formatCount = (value) => numberFormatter.format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return dateFormatter.format(parsedDate);
};

const toArrayData = (value) =>
  Array.isArray(value?.data) ? value.data : Array.isArray(value) ? value : [];

const toPagination = (value, fallbackOffset, fallbackLimit) => {
  const hasMore = Boolean(value?.pagination?.has_more);
  const nextOffsetRaw = value?.pagination?.next_offset;
  const totalRaw = value?.pagination?.total;
  const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : 0;
  const nextOffset = Number.isFinite(Number(nextOffsetRaw))
    ? Number(nextOffsetRaw)
    : fallbackOffset + fallbackLimit;

  return {
    hasMore,
    nextOffset,
    total,
  };
};

const normalizeConnectedClients = (wsStatus) =>
  Array.isArray(wsStatus?.connected_clients)
    ? wsStatus.connected_clients
        .map((entry) => ({
          clientId:
            typeof entry?.client_id === "string" && entry.client_id.trim()
              ? entry.client_id.trim()
              : "default",
          connections: Number(entry?.connections || 0),
        }))
        .filter((entry) => entry.connections > 0)
    : [];

const resolveOrphanStickerImageUrl = (item, clientId) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return "";
  }

  if (typeof item.proxy_image_url === "string" && item.proxy_image_url.trim()) {
    return item.proxy_image_url.trim();
  }

  if (typeof item.relative_path === "string" && item.relative_path.trim()) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      relativePath: item.relative_path,
    });
  }

  if (typeof item.url === "string" && item.url.startsWith("/")) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      resourceUrl: item.url,
    });
  }

  if (typeof item.id === "string" && item.id.trim()) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      resourceUrl: `/api/sticker-packs/orphan-stickers/${encodeURIComponent(item.id.trim())}.webp`,
    });
  }

  return "";
};

const resolvePackCoverUrl = (pack, clientId) => {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return "";
  }

  if (typeof pack.proxy_cover_url === "string" && pack.proxy_cover_url.trim()) {
    return pack.proxy_cover_url.trim();
  }

  if (typeof pack.cover_url === "string" && pack.cover_url.startsWith("/")) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      resourceUrl: pack.cover_url,
    });
  }

  return "";
};

const resolveDataFileImageUrl = (item, clientId) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return "";
  }

  if (typeof item.proxy_image_url === "string" && item.proxy_image_url.trim()) {
    return item.proxy_image_url.trim();
  }

  if (typeof item.relative_path === "string" && item.relative_path.trim()) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      relativePath: item.relative_path,
    });
  }

  if (typeof item.url === "string" && item.url.startsWith("/")) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      resourceUrl: item.url,
    });
  }

  return "";
};

const resolvePackStickerImageUrl = (sticker, packKey, clientId) => {
  if (!sticker || typeof sticker !== "object" || Array.isArray(sticker)) {
    return "";
  }

  if (typeof sticker.proxy_image_url === "string" && sticker.proxy_image_url.trim()) {
    return sticker.proxy_image_url.trim();
  }

  if (typeof sticker.relative_path === "string" && sticker.relative_path.trim()) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      relativePath: sticker.relative_path,
    });
  }

  if (typeof sticker.asset_url === "string" && sticker.asset_url.startsWith("/")) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      resourceUrl: sticker.asset_url,
    });
  }

  if (typeof sticker.url === "string" && sticker.url.startsWith("/")) {
    return buildOmnizapMediaProxyUrl({
      clientId,
      resourceUrl: sticker.url,
    });
  }

  const stickerId =
    typeof sticker.sticker_id === "string" && sticker.sticker_id.trim()
      ? sticker.sticker_id
      : typeof sticker?.asset?.id === "string" && sticker.asset.id.trim()
        ? sticker.asset.id
        : typeof sticker.id === "string" && sticker.id.trim()
          ? sticker.id
          : "";

  if (!stickerId || !packKey) {
    return "";
  }

  return buildOmnizapMediaProxyUrl({
    clientId,
    resourceUrl: `/api/sticker-packs/${encodeURIComponent(packKey)}/stickers/${encodeURIComponent(stickerId)}.webp`,
  });
};

const extractPackDetails = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      pack: null,
      stickers: [],
    };
  }

  const packData =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  const stickers = Array.isArray(packData?.stickers)
    ? packData.stickers
    : Array.isArray(payload?.stickers)
      ? payload.stickers
      : [];

  return {
    pack: packData,
    stickers,
  };
};

const OmnizapSystemStickersPage = () => {
  const { toast } = useToast();

  const [wsStatus, setWsStatus] = useState(null);
  const [clientId, setClientId] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [queryValue, setQueryValue] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [packsState, setPacksState] = useState({
    items: [],
    nextOffset: 0,
    hasMore: true,
    total: 0,
    loadingMore: false,
  });
  const [orphansState, setOrphansState] = useState({
    items: [],
    nextOffset: 0,
    hasMore: true,
    total: 0,
    loadingMore: false,
  });
  const [dataFilesState, setDataFilesState] = useState({
    items: [],
    nextOffset: 0,
    hasMore: true,
    total: 0,
    loadingMore: false,
  });

  const [packDetailsByKey, setPackDetailsByKey] = useState({});
  const [expandedPackKey, setExpandedPackKey] = useState("");
  const [loadingPackKey, setLoadingPackKey] = useState("");

  const connectedClients = useMemo(() => normalizeConnectedClients(wsStatus), [wsStatus]);
  const selectedClientId =
    typeof clientId === "string" && clientId.trim() ? clientId.trim() : "default";

  const refreshWsStatus = useCallback(async () => {
    const status = await fetchOmnizapWsStatus();
    setWsStatus(status);

    const clients = normalizeConnectedClients(status);
    let resolvedClientId = "default";

    if (clients.length === 0) {
      if (!clientId) {
        setClientId("default");
      }
      resolvedClientId =
        typeof clientId === "string" && clientId.trim() ? clientId.trim() : "default";
      return {
        status,
        resolvedClientId,
      };
    }

    if (!clientId || !clients.some((entry) => entry.clientId === clientId)) {
      resolvedClientId = clients[0].clientId;
      setClientId(resolvedClientId);
      return {
        status,
        resolvedClientId,
      };
    }

    resolvedClientId = clientId;
    return {
      status,
      resolvedClientId,
    };
  }, [clientId]);

  const loadPacks = useCallback(
    async ({ clientOverride = "", offset = 0, append = false } = {}) => {
      const effectiveClientId =
        typeof clientOverride === "string" && clientOverride.trim()
          ? clientOverride.trim()
          : selectedClientId;
      const safeOffset = Math.max(0, Number(offset || 0));
      const payload = await fetchOmnizapRemoteStickerPacks({
        clientId: effectiveClientId,
        q: queryValue,
        visibility,
        limit: PACKS_PAGE_SIZE,
        offset: safeOffset,
      });
      const items = toArrayData(payload);
      const pagination = toPagination(payload, safeOffset, PACKS_PAGE_SIZE);

      setPacksState((previous) => ({
        items: append ? previous.items.concat(items) : items,
        nextOffset: pagination.nextOffset,
        hasMore: pagination.hasMore,
        total: pagination.total,
        loadingMore: false,
      }));
    },
    [queryValue, selectedClientId, visibility]
  );

  const loadOrphans = useCallback(
    async ({ clientOverride = "", offset = 0, append = false } = {}) => {
      const effectiveClientId =
        typeof clientOverride === "string" && clientOverride.trim()
          ? clientOverride.trim()
          : selectedClientId;
      const safeOffset = Math.max(0, Number(offset || 0));
      const payload = await fetchOmnizapRemoteOrphanStickers({
        clientId: effectiveClientId,
        q: queryValue,
        limit: ORPHANS_PAGE_SIZE,
        offset: safeOffset,
      });
      const items = toArrayData(payload);
      const pagination = toPagination(payload, safeOffset, ORPHANS_PAGE_SIZE);

      setOrphansState((previous) => ({
        items: append ? previous.items.concat(items) : items,
        nextOffset: pagination.nextOffset,
        hasMore: pagination.hasMore,
        total: pagination.total,
        loadingMore: false,
      }));
    },
    [queryValue, selectedClientId]
  );

  const loadDataFiles = useCallback(
    async ({ clientOverride = "", offset = 0, append = false } = {}) => {
      const effectiveClientId =
        typeof clientOverride === "string" && clientOverride.trim()
          ? clientOverride.trim()
          : selectedClientId;
      const safeOffset = Math.max(0, Number(offset || 0));
      const payload = await fetchOmnizapRemoteDataFiles({
        clientId: effectiveClientId,
        q: queryValue,
        limit: DATA_FILES_PAGE_SIZE,
        offset: safeOffset,
      });
      const items = toArrayData(payload);
      const pagination = toPagination(payload, safeOffset, DATA_FILES_PAGE_SIZE);

      setDataFilesState((previous) => ({
        items: append ? previous.items.concat(items) : items,
        nextOffset: pagination.nextOffset,
        hasMore: pagination.hasMore,
        total: pagination.total,
        loadingMore: false,
      }));
    },
    [queryValue, selectedClientId]
  );

  const reloadAll = useCallback(
    async ({ manual = false } = {}) => {
      setError("");
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const wsResult = await refreshWsStatus();
        const activeClientId = wsResult?.resolvedClientId || selectedClientId;
        setPackDetailsByKey({});
        setExpandedPackKey("");
        await Promise.all([
          loadPacks({ clientOverride: activeClientId, offset: 0, append: false }),
          loadOrphans({ clientOverride: activeClientId, offset: 0, append: false }),
          loadDataFiles({ clientOverride: activeClientId, offset: 0, append: false }),
        ]);
      } catch (requestError) {
        const message =
          requestError?.message ||
          "Nao foi possivel carregar stickers remotos do OmniZap.";
        setError(message);
        toast({
          title: "Falha ao carregar stickers",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadDataFiles, loadOrphans, loadPacks, refreshWsStatus, selectedClientId, toast]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQueryValue(queryInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [queryInput]);

  useEffect(() => {
    if (!selectedClientId) {
      return;
    }

    reloadAll({ manual: false });
  }, [selectedClientId, queryValue, visibility, reloadAll]);

  const loadPackDetails = async (packKey) => {
    if (!packKey) {
      return;
    }

    if (packDetailsByKey[packKey]) {
      setExpandedPackKey((previous) => (previous === packKey ? "" : packKey));
      return;
    }

    setLoadingPackKey(packKey);
    try {
      const payload = await fetchOmnizapRemotePackByKey({
        clientId: selectedClientId,
        packKey,
      });
      const parsed = extractPackDetails(payload);
      setPackDetailsByKey((previous) => ({
        ...previous,
        [packKey]: parsed,
      }));
      setExpandedPackKey(packKey);
    } catch (packError) {
      toast({
        title: "Falha ao carregar pack",
        description: packError?.message || "Nao foi possivel carregar detalhes do pack.",
        variant: "destructive",
      });
    } finally {
      setLoadingPackKey("");
    }
  };

  const onLoadMorePacks = async () => {
    if (!packsState.hasMore || packsState.loadingMore) {
      return;
    }

    setPacksState((previous) => ({ ...previous, loadingMore: true }));
    try {
      await loadPacks({ offset: packsState.nextOffset, append: true });
    } catch (loadError) {
      setPacksState((previous) => ({ ...previous, loadingMore: false }));
      toast({
        title: "Falha ao carregar mais packs",
        description: loadError?.message || "Nao foi possivel carregar mais packs.",
        variant: "destructive",
      });
    }
  };

  const onLoadMoreOrphans = async () => {
    if (!orphansState.hasMore || orphansState.loadingMore) {
      return;
    }

    setOrphansState((previous) => ({ ...previous, loadingMore: true }));
    try {
      await loadOrphans({ offset: orphansState.nextOffset, append: true });
    } catch (loadError) {
      setOrphansState((previous) => ({ ...previous, loadingMore: false }));
      toast({
        title: "Falha ao carregar mais orfas",
        description: loadError?.message || "Nao foi possivel carregar mais stickers orfas.",
        variant: "destructive",
      });
    }
  };

  const onLoadMoreDataFiles = async () => {
    if (!dataFilesState.hasMore || dataFilesState.loadingMore) {
      return;
    }

    setDataFilesState((previous) => ({ ...previous, loadingMore: true }));
    try {
      await loadDataFiles({ offset: dataFilesState.nextOffset, append: true });
    } catch (loadError) {
      setDataFilesState((previous) => ({ ...previous, loadingMore: false }));
      toast({
        title: "Falha ao carregar mais arquivos",
        description: loadError?.message || "Nao foi possivel carregar mais arquivos de sticker.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="min-h-screen pt-32 pb-20 bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-24 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <Button
            asChild
            variant="outline"
            className="border-cyan-400/60 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900"
          >
            <Link to="/projetos/omnizap-system">
              <ArrowLeft size={16} className="mr-2" />
              Voltar para OmniZap
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => reloadAll({ manual: true })}
            disabled={loading || refreshing}
            className="border-pink-500/60 text-pink-500 hover:bg-pink-500 hover:text-white"
          >
            <RefreshCw size={16} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar tudo
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <NeonText color="cyan" intensity="high">
              OmniZap Stickers
            </NeonText>
          </h1>
          <p className="text-gray-300 max-w-4xl">
            Pagina dedicada para renderizar stickers remotos do OmniZap System via
            WebSocket, usando os endpoints de packs, orfas e arquivos em
            <span className="text-cyan-300"> /data</span>.
          </p>
        </motion.div>

        <NeonBox color="accent" className="p-5 bg-gray-900/80 mb-6" hover={false}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Busca (q)</label>
              <div className="flex items-center gap-2 rounded-md border border-cyan-400/30 bg-gray-800/70 px-3">
                <Search size={14} className="text-cyan-300" />
                <input
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Filtrar por nome/chave..."
                  className="w-full bg-transparent py-2 text-sm text-gray-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Visibilidade</label>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                className="w-full rounded-md border border-cyan-400/30 bg-gray-800/70 px-3 py-2 text-sm text-gray-100 outline-none"
              >
                <option value="public">public</option>
                <option value="unlisted">unlisted</option>
                <option value="all">all</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Cliente WS</label>
              <select
                value={selectedClientId}
                onChange={(event) => setClientId(event.target.value)}
                className="w-full rounded-md border border-cyan-400/30 bg-gray-800/70 px-3 py-2 text-sm text-gray-100 outline-none"
              >
                {connectedClients.length === 0 ? (
                  <option value="default">default (offline)</option>
                ) : (
                  connectedClients.map((entry) => (
                    <option key={entry.clientId} value={entry.clientId}>
                      {entry.clientId} ({entry.connections})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-300">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1">
              <Server size={12} />
              Conexoes WS: {formatCount(wsStatus?.total_connections || 0)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1">
              Fila pendente: {formatCount(wsStatus?.outbox_pending_total || 0)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1">
              Cliente ativo: {selectedClientId}
            </span>
          </div>
        </NeonBox>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400" />
          </div>
        ) : error ? (
          <NeonBox color="magenta" className="p-8 bg-gray-900/80" hover={false}>
            <p className="text-pink-300 text-lg">Falha ao carregar stickers remotos.</p>
            <p className="text-gray-300 mt-2 text-sm">{error}</p>
          </NeonBox>
        ) : (
          <div className="space-y-6">
            <NeonBox color="cyan" className="p-5 bg-gray-900/80" hover={false}>
              <h2 className="text-xl text-white font-semibold mb-3">
                Packs ({formatCount(packsState.items.length)} / {formatCount(packsState.total)})
              </h2>

              {packsState.items.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum pack encontrado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packsState.items.map((pack, packIndex) => {
                    const packKey =
                      typeof pack?.pack_key === "string" ? pack.pack_key : "";
                    const coverUrl = resolvePackCoverUrl(pack, selectedClientId);
                    const packDetails = packDetailsByKey[packKey];

                    return (
                      <div
                        key={packKey || pack?.id || `pack-${packIndex}`}
                        className="rounded-lg border border-cyan-400/25 bg-gray-800/60 p-3"
                      >
                        <div className="aspect-square rounded-md overflow-hidden bg-gray-900 mb-2">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={pack?.name || "Pack"}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                              Sem capa
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-white truncate">
                          {pack?.name || "Sem nome"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {pack?.publisher || "Sem publisher"}
                        </p>
                        <p className="text-xs text-cyan-300 mt-1">
                          {formatCount(pack?.sticker_count || 0)} stickers
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Atualizado: {formatDate(pack?.updated_at)}
                        </p>

                        {packKey ? (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-cyan-400/40 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900"
                              onClick={() => loadPackDetails(packKey)}
                              disabled={loadingPackKey === packKey}
                            >
                              {loadingPackKey === packKey
                                ? "Carregando..."
                                : expandedPackKey === packKey
                                  ? "Ocultar stickers"
                                  : "Ver stickers"}
                            </Button>

                            {expandedPackKey === packKey && packDetails && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {packDetails.stickers.length === 0 ? (
                                  <p className="col-span-3 text-xs text-gray-500">
                                    Sem stickers listados neste pack.
                                  </p>
                                ) : (
                                  packDetails.stickers.slice(0, 24).map((sticker, stickerIndex) => {
                                    const stickerImageUrl = resolvePackStickerImageUrl(
                                      sticker,
                                      packKey,
                                      selectedClientId
                                    );

                                    return (
                                      <div
                                        key={
                                          sticker?.id ||
                                          sticker?.sticker_id ||
                                          sticker?.relative_path ||
                                          `pack-sticker-${stickerIndex}`
                                        }
                                        className="aspect-square rounded-md overflow-hidden bg-gray-900 border border-cyan-400/20"
                                      >
                                        {stickerImageUrl ? (
                                          <img
                                            src={stickerImageUrl}
                                            alt="Sticker do pack"
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                          />
                                        ) : null}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {packsState.hasMore && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={onLoadMorePacks}
                    disabled={packsState.loadingMore}
                    className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900"
                  >
                    {packsState.loadingMore ? "Carregando..." : "Carregar mais packs"}
                  </Button>
                </div>
              )}
            </NeonBox>

            <NeonBox color="magenta" className="p-5 bg-gray-900/80" hover={false}>
              <h2 className="text-xl text-white font-semibold mb-3">
                Stickers orfas (
                {formatCount(orphansState.items.length)} / {formatCount(orphansState.total)})
              </h2>

              {orphansState.items.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma sticker orfa encontrada.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {orphansState.items.map((item, orphanIndex) => {
                    const imageUrl = resolveOrphanStickerImageUrl(item, selectedClientId);

                    return (
                      <a
                        key={
                          item?.id ||
                          item?.relative_path ||
                          item?.url ||
                          item?.name ||
                          `orphan-${orphanIndex}`
                        }
                        href={imageUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-pink-500/30 bg-gray-800/60 p-2"
                      >
                        <div className="aspect-square rounded-md overflow-hidden bg-gray-900 mb-2">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item?.name || "Sticker orfa"}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <p className="text-[11px] text-gray-300 truncate">
                          {item?.name || item?.id || "Sticker"}
                        </p>
                      </a>
                    );
                  })}
                </div>
              )}

              {orphansState.hasMore && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={onLoadMoreOrphans}
                    disabled={orphansState.loadingMore}
                    className="border-pink-500/50 text-pink-300 hover:bg-pink-500 hover:text-white"
                  >
                    {orphansState.loadingMore ? "Carregando..." : "Carregar mais orfas"}
                  </Button>
                </div>
              )}
            </NeonBox>

            <NeonBox color="accent" className="p-5 bg-gray-900/80" hover={false}>
              <h2 className="text-xl text-white font-semibold mb-3">
                Arquivos em /data (
                {formatCount(dataFilesState.items.length)} / {formatCount(dataFilesState.total)})
              </h2>

              {dataFilesState.items.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum arquivo de sticker em /data.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {dataFilesState.items.map((item, fileIndex) => {
                    const imageUrl = resolveDataFileImageUrl(item, selectedClientId);
                    return (
                      <a
                        key={item?.relative_path || item?.name || `file-${fileIndex}`}
                        href={imageUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-cyan-400/25 bg-gray-800/60 p-2 hover:border-cyan-400/50 transition-colors"
                      >
                        <div className="aspect-square rounded-md overflow-hidden bg-gray-900 mb-2">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item?.name || "Sticker"}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <p className="text-[11px] text-gray-300 truncate">
                          {item?.name || "arquivo.webp"}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {formatDate(item?.updated_at)}
                        </p>
                      </a>
                    );
                  })}
                </div>
              )}

              {dataFilesState.hasMore && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={onLoadMoreDataFiles}
                    disabled={dataFilesState.loadingMore}
                    className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900"
                  >
                    {dataFilesState.loadingMore ? "Carregando..." : "Carregar mais arquivos"}
                  </Button>
                </div>
              )}
            </NeonBox>
          </div>
        )}
      </div>
    </section>
  );
};

export default OmnizapSystemStickersPage;
