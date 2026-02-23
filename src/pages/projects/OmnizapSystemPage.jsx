import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Eye,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  GitFork,
  Lock,
  RefreshCw,
  Server,
  Star,
  Users,
} from 'lucide-react';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchGitHubLatestRelease,
  fetchGitHubRepo,
  fetchGitHubRepoCommits,
  fetchGitHubRepoContributors,
  fetchGitHubRepoLanguages,
  fetchGitHubRepoReadme,
} from '@/lib/githubApi';
import { fetchOmnizapWebhookLatest } from '@/lib/omnizapWebhookApi';

const PROJECT_OWNER = 'kaikybrofc';
const PROJECT_NAME = 'omnizap-system';
const WEBHOOK_POLL_INTERVAL_MS = 30_000;

const numberFormatter = new Intl.NumberFormat('pt-BR');
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDate = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return dateFormatter.format(date);
};

const formatCount = (value) => numberFormatter.format(Number(value || 0));

const formatKb = (sizeInKb) => {
  const size = Number(sizeInKb || 0);
  if (!size) return '0 KB';

  if (size < 1024) {
    return `${numberFormatter.format(size)} KB`;
  }

  return `${(size / 1024).toFixed(2)} MB`;
};

const toReadmeText = (readmeData) => {
  const content = readmeData?.content;

  if (!content) {
    return '';
  }

  try {
    const normalized = content.replace(/\n/g, '');
    const decoded = atob(normalized);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
};

const stripMarkdown = (value) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getReadmeSummary = (readmeData, repoData) => {
  const text = toReadmeText(readmeData);
  if (!text) {
    return stripMarkdown(repoData?.description || '');
  }

  const lines = text
    .split(/\n\s*\n/)
    .map((line) => stripMarkdown(line))
    .filter((line) => line.length > 40);

  return lines[0] || stripMarkdown(text).slice(0, 320);
};

const getWebhookRoutesPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  if (
    payload.route_data &&
    typeof payload.route_data === 'object' &&
    !Array.isArray(payload.route_data)
  ) {
    return payload.route_data;
  }

  if (
    payload.routes &&
    typeof payload.routes === 'object' &&
    !Array.isArray(payload.routes)
  ) {
    return payload.routes;
  }

  return payload;
};

const extractRouteItemCount = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return Number(value);
  if (Array.isArray(value)) return value.length;
  if (typeof value !== 'object') return null;

  const numericKeys = ['total', 'count', 'total_count', 'items_count'];
  for (const key of numericKeys) {
    if (typeof value[key] === 'number') {
      return Number(value[key]);
    }
  }

  const arrayKeys = [
    'items',
    'data',
    'results',
    'rows',
    'packs',
    'sticker_packs',
    'stickers',
    'files',
  ];
  for (const key of arrayKeys) {
    if (Array.isArray(value[key])) {
      return value[key].length;
    }
  }

  return null;
};

const OmniZapSystemPage = () => {
  const { githubToken } = useAuth();
  const { toast } = useToast();

  const [repo, setRepo] = useState(null);
  const [languages, setLanguages] = useState({});
  const [commits, setCommits] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [latestRelease, setLatestRelease] = useState(null);
  const [readmeSummary, setReadmeSummary] = useState('');
  const [webhookSnapshot, setWebhookSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const hasToken = Boolean(githubToken);

  const languageRows = useMemo(() => {
    const entries = Object.entries(languages || {});
    const total = entries.reduce((acc, [, bytes]) => acc + Number(bytes || 0), 0);

    if (!total) {
      return [];
    }

    return entries
      .map(([name, bytes]) => {
        const numericBytes = Number(bytes || 0);
        return {
          name,
          bytes: numericBytes,
          percent: (numericBytes / total) * 100,
        };
      })
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);
  }, [languages]);

  const webhookSummary = useMemo(() => {
    if (!webhookSnapshot?.payload) {
      return null;
    }

    const routesPayload = getWebhookRoutesPayload(webhookSnapshot.payload);
    const entries = Object.entries(routesPayload).filter(
      ([key, value]) =>
        typeof key === 'string' &&
        key.trim().length > 0 &&
        value != null &&
        (Array.isArray(value) || typeof value === 'object' || typeof value === 'number')
    );

    const findByKeys = (keywords) => {
      const entry = entries.find(([routeKey]) => {
        const normalized = routeKey.toLowerCase();
        return keywords.every((keyword) => normalized.includes(keyword));
      });

      return entry ? extractRouteItemCount(entry[1]) : null;
    };

    return {
      source: webhookSnapshot.source,
      receivedAt: webhookSnapshot.received_at,
      routeCount: entries.length,
      routeKeys: entries.map(([routeKey]) => routeKey).slice(0, 8),
      stickerPacks: findByKeys(['sticker-packs']),
      orphanStickers: findByKeys(['orphan']),
      dataFiles: findByKeys(['data-files']),
    };
  }, [webhookSnapshot]);

  const loadProjectData = useCallback(
    async (isManualRefresh = false) => {
      setError('');
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const requestOptions = hasToken
        ? {
            token: githubToken,
            // Keep API cache as primary source, which can use server-side GITHUB_TOKEN.
            preferDirect: false,
          }
        : {};

      try {
        const repoData = await fetchGitHubRepo(
          PROJECT_OWNER,
          PROJECT_NAME,
          requestOptions
        );
        const [languagesData, commitsData, contributorsData, releaseData, readmeData, webhookData] =
          await Promise.all([
            fetchGitHubRepoLanguages(PROJECT_OWNER, PROJECT_NAME, requestOptions),
            fetchGitHubRepoCommits(
              PROJECT_OWNER,
              PROJECT_NAME,
              'per_page=8',
              requestOptions
            ),
            fetchGitHubRepoContributors(
              PROJECT_OWNER,
              PROJECT_NAME,
              'per_page=6',
              requestOptions
            ),
            fetchGitHubLatestRelease(PROJECT_OWNER, PROJECT_NAME, requestOptions),
            fetchGitHubRepoReadme(PROJECT_OWNER, PROJECT_NAME, requestOptions),
            fetchOmnizapWebhookLatest().catch((webhookError) => {
              console.warn('Nao foi possivel carregar o webhook OmniZap.', webhookError);
              return null;
            }),
          ]);

        setRepo(repoData);
        const hasLanguages = Object.keys(languagesData || {}).length > 0;
        setLanguages(
          hasLanguages
            ? languagesData
            : repoData?.language
              ? { [repoData.language]: 1 }
              : {}
        );
        setCommits(commitsData);
        setContributors(contributorsData);
        setLatestRelease(releaseData);
        setReadmeSummary(getReadmeSummary(readmeData, repoData));
        setWebhookSnapshot(webhookData);
      } catch (requestError) {
        console.error('Erro ao carregar dados completos do projeto:', requestError);
        const message =
          requestError?.message || 'Nao foi possivel carregar os detalhes completos do projeto.';
        setError(message);

        toast({
          title: 'Erro ao buscar dados do projeto',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [githubToken, hasToken, toast]
  );

  useEffect(() => {
    loadProjectData(false);
  }, [loadProjectData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchOmnizapWebhookLatest()
        .then((webhookData) => {
          setWebhookSnapshot(webhookData);
        })
        .catch((webhookError) => {
          console.warn('Nao foi possivel atualizar o webhook OmniZap.', webhookError);
        });
    }, WEBHOOK_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const statusLabel = hasToken
    ? 'Dados carregados pela API com suporte ao token da sessao.'
    : 'Dados carregados automaticamente pela API do servidor.';

  return (
    <section className="min-h-screen pt-32 pb-20 bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <Button
            asChild
            variant="outline"
            className="border-cyan-400/60 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900"
          >
            <Link to="/">
              <ArrowLeft size={16} className="mr-2" />
              Voltar ao portfolio
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => loadProjectData(true)}
            disabled={loading || refreshing}
            className="border-pink-500/60 text-pink-500 hover:bg-pink-500 hover:text-white"
          >
            <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar dados
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <NeonText color="cyan" intensity="high">
              OmniZap System
            </NeonText>
          </h1>

          <p className="text-gray-300 text-lg max-w-3xl">
            Area dedicada ao repositorio
            <span className="text-cyan-300"> {PROJECT_OWNER}/{PROJECT_NAME}</span>, com
            metricas de atividade, stack e dados de manutencao em tempo real.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 px-4 py-2 bg-gray-900/70 text-sm text-gray-200">
            <Lock size={14} className={hasToken ? 'text-cyan-300' : 'text-pink-400'} />
            <span>{statusLabel}</span>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400" />
          </div>
        ) : error ? (
          <NeonBox color="magenta" className="p-8 bg-gray-900/80" hover={false}>
            <p className="text-pink-300 text-lg">Nao foi possivel carregar os dados do projeto.</p>
            <p className="text-gray-300 mt-2 text-sm">{error}</p>
          </NeonBox>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <NeonBox color="cyan" className="p-6 bg-gray-900/80 lg:col-span-2" hover={false}>
                <h2 className="text-2xl font-bold text-white mb-3">Visao geral</h2>
                <p className="text-gray-300 leading-relaxed">
                  {repo?.description || 'Repositorio sem descricao publica.'}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {(repo?.topics || []).slice(0, 10).map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 rounded-full text-xs border border-cyan-400/40 text-cyan-300 bg-cyan-400/10"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  <Button
                    asChild
                    variant="outline"
                    className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900"
                  >
                    <a href={repo?.html_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={16} className="mr-2" />
                      Abrir no GitHub
                    </a>
                  </Button>

                  {repo?.homepage && (
                    <Button
                      asChild
                      variant="outline"
                      className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
                    >
                      <a href={repo.homepage} target="_blank" rel="noopener noreferrer">
                        <Eye size={16} className="mr-2" />
                        Acessar app/demo
                      </a>
                    </Button>
                  )}
                </div>
              </NeonBox>

              <NeonBox color="accent" className="p-6 bg-gray-900/80" hover={false}>
                <h2 className="text-2xl font-bold text-white mb-4">Status do repo</h2>
                <div className="space-y-3 text-sm text-gray-300">
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">Visibilidade</span>
                    <span className="uppercase tracking-wide text-cyan-300">
                      {repo?.visibility || 'public'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">Branch padrao</span>
                    <span className="text-white">{repo?.default_branch || '-'}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">Tamanho</span>
                    <span className="text-white">{formatKb(repo?.size)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">Criado em</span>
                    <span className="text-white">{formatDate(repo?.created_at)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">Ultima atualizacao</span>
                    <span className="text-white">{formatDate(repo?.updated_at)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">Ultimo push</span>
                    <span className="text-white">{formatDate(repo?.pushed_at)}</span>
                  </p>
                </div>
              </NeonBox>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <NeonBox color="cyan" className="p-4 bg-gray-900/80" hover={false}>
                <p className="text-xs text-gray-400 mb-1">Stars</p>
                <p className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
                  <Star size={16} />
                  {formatCount(repo?.stargazers_count)}
                </p>
              </NeonBox>

              <NeonBox color="magenta" className="p-4 bg-gray-900/80" hover={false}>
                <p className="text-xs text-gray-400 mb-1">Forks</p>
                <p className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                  <GitFork size={16} />
                  {formatCount(repo?.forks_count)}
                </p>
              </NeonBox>

              <NeonBox color="accent" className="p-4 bg-gray-900/80" hover={false}>
                <p className="text-xs text-gray-400 mb-1">Watchers</p>
                <p className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
                  <Eye size={16} />
                  {formatCount(repo?.subscribers_count || repo?.watchers_count)}
                </p>
              </NeonBox>

              <NeonBox color="cyan" className="p-4 bg-gray-900/80" hover={false}>
                <p className="text-xs text-gray-400 mb-1">Issues abertas</p>
                <p className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
                  <GitBranch size={16} />
                  {formatCount(repo?.open_issues_count)}
                </p>
              </NeonBox>

              <NeonBox color="magenta" className="p-4 bg-gray-900/80" hover={false}>
                <p className="text-xs text-gray-400 mb-1">Contribuidores</p>
                <p className="text-2xl font-bold text-pink-400 flex items-center gap-2">
                  <Users size={16} />
                  {formatCount(contributors.length)}
                </p>
              </NeonBox>

              <NeonBox color="accent" className="p-4 bg-gray-900/80" hover={false}>
                <p className="text-xs text-gray-400 mb-1">Commits listados</p>
                <p className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
                  <GitCommitHorizontal size={16} />
                  {formatCount(commits.length)}
                </p>
              </NeonBox>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NeonBox color="accent" className="p-6 bg-gray-900/80" hover={false}>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Server size={18} />
                  Webhook OmniZap (localhost)
                </h3>

                {webhookSummary ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">
                      Ultimo envio: <span className="text-cyan-300">{formatDate(webhookSummary.receivedAt)}</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Origem: <span className="text-cyan-300">{webhookSummary.source || 'omnizap-local'}</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Rotas recebidas: <span className="text-cyan-300">{formatCount(webhookSummary.routeCount)}</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <div className="rounded-lg border border-cyan-400/30 bg-gray-800/60 p-3">
                        <p className="text-xs text-gray-400">Sticker packs</p>
                        <p className="text-lg text-cyan-300 font-semibold">
                          {webhookSummary.stickerPacks == null
                            ? '-'
                            : formatCount(webhookSummary.stickerPacks)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-cyan-400/30 bg-gray-800/60 p-3">
                        <p className="text-xs text-gray-400">Orphan stickers</p>
                        <p className="text-lg text-cyan-300 font-semibold">
                          {webhookSummary.orphanStickers == null
                            ? '-'
                            : formatCount(webhookSummary.orphanStickers)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-cyan-400/30 bg-gray-800/60 p-3">
                        <p className="text-xs text-gray-400">Data files</p>
                        <p className="text-lg text-cyan-300 font-semibold">
                          {webhookSummary.dataFiles == null
                            ? '-'
                            : formatCount(webhookSummary.dataFiles)}
                        </p>
                      </div>
                    </div>

                    {webhookSummary.routeKeys.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {webhookSummary.routeKeys.map((routeKey) => (
                          <span
                            key={routeKey}
                            className="px-2 py-1 text-xs rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                          >
                            {routeKey}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Nenhum payload do webhook foi recebido ainda.
                  </p>
                )}
              </NeonBox>

              <NeonBox color="cyan" className="p-6 bg-gray-900/80" hover={false}>
                <h3 className="text-xl font-bold text-white mb-4">Linguagens</h3>
                {languageRows.length === 0 ? (
                  <p className="text-gray-400 text-sm">Sem dados de linguagens.</p>
                ) : (
                  <div className="space-y-3">
                    {languageRows.map((language) => (
                      <div key={language.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-200">{language.name}</span>
                          <span className="text-cyan-300">
                            {language.percent.toFixed(1)}% ({formatCount(language.bytes)} bytes)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500"
                            style={{ width: `${Math.max(4, language.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </NeonBox>

              <NeonBox color="magenta" className="p-6 bg-gray-900/80" hover={false}>
                <h3 className="text-xl font-bold text-white mb-4">Ultima release</h3>
                {latestRelease ? (
                  <>
                    <p className="text-pink-300 font-semibold text-lg">{latestRelease.tag_name}</p>
                    <p className="text-gray-300 text-sm mt-1">
                      Publicada em {formatDate(latestRelease.published_at)}
                    </p>
                    <p className="text-gray-300 mt-3 text-sm leading-relaxed line-clamp-5">
                      {latestRelease.body || 'Sem notas de release publicas.'}
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      className="mt-4 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
                    >
                      <a href={latestRelease.html_url} target="_blank" rel="noopener noreferrer">
                        Ver release completa
                      </a>
                    </Button>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Nenhuma release publicada encontrada.</p>
                )}
              </NeonBox>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NeonBox color="accent" className="p-6 bg-gray-900/80" hover={false}>
                <h3 className="text-xl font-bold text-white mb-4">Commits recentes</h3>
                {commits.length === 0 ? (
                  <p className="text-gray-400 text-sm">Nenhum commit recente encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {commits.map((commit) => (
                      <a
                        key={commit.sha}
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-cyan-400/20 bg-gray-800/60 p-3 hover:border-cyan-400/50 transition-colors"
                      >
                        <p className="text-sm text-white line-clamp-2">{commit.commit?.message || '-'}</p>
                        <div className="mt-2 text-xs text-gray-400 flex flex-wrap gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} />
                            {commit.commit?.author?.name || 'Autor desconhecido'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(commit.commit?.author?.date)}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </NeonBox>

              <NeonBox color="cyan" className="p-6 bg-gray-900/80" hover={false}>
                <h3 className="text-xl font-bold text-white mb-4">Top contribuidores</h3>
                {contributors.length === 0 ? (
                  <p className="text-gray-400 text-sm">Sem contribuidores publicos listados.</p>
                ) : (
                  <div className="space-y-3">
                    {contributors.map((contributor) => (
                      <a
                        key={contributor.id || contributor.login}
                        href={contributor.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-cyan-400/20 bg-gray-800/60 p-3 hover:border-cyan-400/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={contributor.avatar_url}
                            alt={contributor.login}
                            className="w-9 h-9 rounded-full border border-cyan-400/40"
                          />
                          <div>
                            <p className="text-sm text-white">{contributor.login}</p>
                            <p className="text-xs text-gray-400">{contributor.type || 'User'}</p>
                          </div>
                        </div>
                        <span className="text-sm text-cyan-300">
                          {formatCount(contributor.contributions)} commits
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </NeonBox>
            </div>

            <NeonBox color="magenta" className="p-6 bg-gray-900/80" hover={false}>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <FileText size={18} />
                Resumo do README
              </h3>

              {readmeSummary ? (
                <p className="text-gray-300 leading-relaxed">{readmeSummary}</p>
              ) : (
                <p className="text-gray-400 text-sm">
                  Nao foi possivel gerar resumo automatico do README.
                </p>
              )}
            </NeonBox>
          </div>
        )}
      </div>
    </section>
  );
};

export default OmniZapSystemPage;
