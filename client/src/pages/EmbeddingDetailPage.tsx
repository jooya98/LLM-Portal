import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowUp, ArrowDown, X, ChevronLeft } from 'lucide-react'
import { useI18n } from '@/i18n'
import { apiFetch } from '@/lib/api'
import { CopyButton } from '@/components/copy-button'
import { PageHeader } from '@/components/page-header'
import { ModelsTabs } from '@/components/models-tabs'
import { apiBaseUrl, ApiUsageBlock } from '@/components/api-usage'

interface ProviderEntry {
  id: number
  platform: string
  modelId: string
  displayName: string
  priority: number
  enabled: boolean
  quotaLabel: string
  keyCount: number
}
interface Family {
  family: string
  dimensions: number
  maxInputTokens: number | null
  isDefault: boolean
  providers: ProviderEntry[]
}
interface EmbeddingsData { defaultFamily: string; families: Family[] }

// One embedding family's page: the providers serving it (failover routes across
// them, same vector space) + a ready-to-run snippet. The family list / routing
// management stays on the Embeddings tab; this mirrors the chat model page.
export default function EmbeddingDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const family = id ? decodeURIComponent(id) : ''

  const { data, isLoading } = useQuery<EmbeddingsData>({
    queryKey: ['embeddings'],
    queryFn: () => apiFetch('/api/embeddings'),
  })
  const { data: keyData } = useQuery<{ apiKey: string }>({
    queryKey: ['unified-key'],
    queryFn: () => apiFetch('/api/settings/api-key'),
  })

  const fam = (data?.families ?? []).find(f => f.family === family)
  const queryClient = useQueryClient()
  const { data: fallbackOverride } = useQuery<{ chain: string[] | null }>({
    queryKey: ['embedding-fallback-override', family],
    queryFn: () => apiFetch(`/api/embeddings/${encodeURIComponent(family)}/fallback-override`),
    enabled: !!family,
  })
  const otherFamilies = (data?.families ?? []).filter(f => f.family !== family)
  const setOverrideMutation = useMutation({
    mutationFn: (chain: string[]) =>
      apiFetch(`/api/embeddings/${encodeURIComponent(family)}/fallback-override`, { method: 'PUT', body: JSON.stringify({ chain }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['embedding-fallback-override', family] }),
  })
  const clearOverrideMutation = useMutation({
    mutationFn: () => apiFetch(`/api/embeddings/${encodeURIComponent(family)}/fallback-override`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['embedding-fallback-override', family] }),
  })
  const [chainDraft, setChainDraft] = useState<string[]>([])
  const [selectedFamily, setSelectedFamily] = useState<string>('')
  useEffect(() => setChainDraft(fallbackOverride?.chain ?? []), [fallbackOverride])

  const base = apiBaseUrl()
  const key = keyData?.apiKey || 'YOUR_API_KEY'
  const snippet = `curl ${base}/embeddings \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${family}",
    "input": "hello world"
  }'`

  return (
    <div>
      <PageHeader title={family || t('models.providersHeading')} description={t('models.providersHeading')} divider={false} actions={<ModelsTabs />} />

      <div className="space-y-6">
        <Link to="/models/embeddings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />{t('models.backToModels')}
        </Link>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !fam ? (
          <div className="rounded-3xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('models.modelNotFound')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">{t('models.providerCount', { count: fam.providers.length })}</span>
              <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground tabular-nums">{fam.dimensions}d</span>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-medium">{t('models.providerIdsHeading')}</h2>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{t('models.providerIdsHint')}</p>
              <div className="space-y-1.5">
                {fam.providers.map(p => (
                  <div key={p.id} className={`flex items-center gap-2 text-xs ${p.enabled ? '' : 'opacity-50'}`}>
                    <span className="w-28 shrink-0 text-muted-foreground">{p.platform}</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{p.modelId}</code>
                    {p.keyCount === 0 && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-amber-600/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">{t('models.noKey')}</span>
                    )}
                    <CopyButton text={p.modelId} label={t('models.copyModelName')} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-medium">Manual fallback chain</h2>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                Tried in this exact order if every provider in this family fails.
                Leave empty to error out instead of falling back to another family.
              </p>

              <div className="space-y-2">
                {chainDraft.map((familyName, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="w-6 text-muted-foreground">{index + 1}.</span>
                    <span className="flex-1 rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
                      {familyName}
                    </span>
                    <button
                      type="button"
                      className={`p-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={index === 0}
                      onClick={() => {
                        const newChain = [...chainDraft]
                        const [item] = newChain.splice(index, 1)
                        newChain.splice(index - 1, 0, item)
                        setChainDraft(newChain)
                      }}
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      className={`p-0.5 ${index === chainDraft.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={index === chainDraft.length - 1}
                      onClick={() => {
                        const newChain = [...chainDraft]
                        const [item] = newChain.splice(index, 1)
                        newChain.splice(index + 1, 0, item)
                        setChainDraft(newChain)
                      }}
                    >
                      <ArrowDown className="size-3" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5"
                      onClick={() => {
                        const newChain = [...chainDraft]
                        newChain.splice(index, 1)
                        setChainDraft(newChain)
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <select
                    className="h-6 text-xs bg-muted border rounded px-2 py-0.5"
                    value={selectedFamily}
                    onChange={(e) => setSelectedFamily(e.target.value)}
                  >
                    <option value="">Select a family to add</option>
                    {otherFamilies
                      .filter(f => !chainDraft.includes(f.family))
                      .map(f => (
                        <option key={f.family} value={f.family}>
                          {f.family}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    disabled={!selectedFamily}
                    onClick={() => {
                      if (selectedFamily) {
                        setChainDraft([...chainDraft, selectedFamily])
                        setSelectedFamily('')
                      }
                    }}
                  >
                    Add
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    disabled={setOverrideMutation.isPending || chainDraft.length === 0}
                    onClick={() => setOverrideMutation.mutate(chainDraft)}
                  >
                    {setOverrideMutation.isPending ? 'Saving...' : 'Save chain'}
                  </button>
                  {fallbackOverride?.chain && fallbackOverride.chain.length > 0 && (
                    <button
                      type="button"
                      className="text-xs px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                      onClick={() => clearOverrideMutation.mutate()}
                      disabled={clearOverrideMutation.isPending}
                    >
                      {clearOverrideMutation.isPending ? 'Clearing...' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <ApiUsageBlock snippet={snippet} />
          </>
        )}
      </div>
    </div>
  )
}
