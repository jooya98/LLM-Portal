import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ArrowUp, ArrowDown, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { apiFetch } from '@/lib/api'
import { CopyButton } from '@/components/copy-button'
import { PageHeader } from '@/components/page-header'
import { ModelCombobox } from '@/components/model-combobox'
import { ModelsTabs } from '@/components/models-tabs'
import { Switch } from '@/components/ui/switch'
import { apiBaseUrl, ApiUsageBlock } from '@/components/api-usage'
import type { MediaModel } from '@/components/media-models'

// One generative-media model's page: every provider that serves this logical
// model (failover routes across them), plus a ready-to-run snippet. Mirrors the
// chat ModelDetailPage for the image, audio (TTS), and transcription (STT)
// modalities. Transcription models list on the Audio tab, so their back link
// points there.
export default function MediaDetailPage({ modality }: { modality: 'image' | 'audio' | 'transcription' }) {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const label = id ? decodeURIComponent(id) : ''
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ models: MediaModel[] }>({
    queryKey: ['media'],
    queryFn: () => apiFetch('/api/media'),
  })
  const { data: keyData } = useQuery<{ apiKey: string }>({
    queryKey: ['unified-key'],
    queryFn: () => apiFetch('/api/settings/api-key'),
  })

  const toggle = useMutation({
    mutationFn: (vars: { mediaId: number; enabled: boolean }) =>
      apiFetch(`/api/media/${vars.mediaId}`, { method: 'PUT', body: JSON.stringify({ enabled: vars.enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  })

  const members = (data?.models ?? []).filter(m => m.modality === modality && m.displayName === label)

  const primaryModelDbId = members[0]?.id
  const { data: fallbackOverride } = useQuery<{ chain: number[] | null }>({
    queryKey: ['media-fallback-override', primaryModelDbId],
    queryFn: () => apiFetch(`/api/media/${primaryModelDbId}/fallback-override`),
    enabled: primaryModelDbId != null,
  })
  const sameModalityModels = (data?.models ?? []).filter(m => m.modality === modality)
  const setOverrideMutation = useMutation({
    mutationFn: (chain: number[]) =>
      apiFetch(`/api/media/${primaryModelDbId}/fallback-override`, { method: 'PUT', body: JSON.stringify({ chain }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-fallback-override', primaryModelDbId] }),
  })
  const clearOverrideMutation = useMutation({
    mutationFn: () => apiFetch(`/api/media/${primaryModelDbId}/fallback-override`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-fallback-override', primaryModelDbId] }),
  })
  const [chainDraft, setChainDraft] = useState<number[]>([])
  useEffect(() => setChainDraft(fallbackOverride?.chain ?? []), [fallbackOverride])

  const quota = members.map(m => m.quotaLabel).find(Boolean)

  // A ready-to-run request. `model: "auto"` also works (tries every provider);
  // here we pin the first provider's id as a concrete example.
  const exampleModel = members[0]?.modelId ?? 'auto'
  const base = apiBaseUrl()
  const key = keyData?.apiKey || 'YOUR_API_KEY'
  const snippet = modality === 'image'
    ? `curl ${base}/images/generations \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${exampleModel}",
    "prompt": "a red cat"
  }'`
    : modality === 'transcription'
      ? `curl ${base}/audio/transcriptions \\
  -H "Authorization: Bearer ${key}" \\
  -F file=@audio.mp3 \\
  -F model="${exampleModel}"`
      : `curl ${base}/audio/speech \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${exampleModel}",
    "input": "Hello world"
  }' --output speech.mp3`

  return (
    <div>
      <PageHeader title={label || t('models.providersHeading')} description={t('models.providersHeading')} divider={false} actions={<ModelsTabs />} />

      <div className="space-y-6">
        <Link to={modality === 'transcription' ? '/models/audio' : `/models/${modality}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />{t('models.backToModels')}
        </Link>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : members.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('models.modelNotFound')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground">{t('models.providerCount', { count: members.length })}</span>
              {quota && <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground tabular-nums">{quota}</span>}
            </div>

            {/* Providers serving this model — pin one with its id, or toggle it. */}
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-medium">{t('models.providerIdsHeading')}</h2>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{t('models.providerIdsHint')}</p>
              <div className="space-y-1.5">
                {members.map(m => (
                  <div key={m.id} className={`flex items-center gap-2 text-xs ${m.enabled ? '' : 'opacity-50'}`}>
                    <span className="w-28 shrink-0 text-muted-foreground">{m.platform}</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{m.modelId}</code>
                    {m.keyCount === 0 && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-amber-600/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">{t('models.noKey')}</span>
                    )}
                    <CopyButton text={m.modelId} label={t('models.copyModelName')} />
                    <Switch checked={m.enabled} onCheckedChange={(c) => toggle.mutate({ mediaId: m.id, enabled: c })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Manual fallback chain */}
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-medium">Manual fallback chain</h2>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                Tried in this exact order if every provider above fails. Leave empty to error out instead of falling back.
                Only models from this same tab (image/audio/transcription) can be added — mixing modalities isn't supported.
              </p>

              <div className="space-y-2 mb-4">
                {chainDraft.map((modelId, index) => {
                  const model = sameModalityModels.find(m => m.id === modelId)
                  return (
                    <div key={modelId} className="flex items-center gap-2 text-xs">
                      <span className="w-5 shrink-0 text-muted-foreground text-center">{index + 1}.</span>
                      <span className="w-28 shrink-0 text-muted-foreground">{model?.platform}</span>
                      <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{model?.modelId}</code>
                      <button
                        type="button"
                        onClick={() => setChainDraft(c => c.filter((_, i) => i !== index))}
                        className="p-1 hover:bg-muted rounded"
                        aria-label="Remove"
                      >
                        <X className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setChainDraft(c => {
                          const newChain = [...c]
                          if (index > 0) {
                            [newChain[index - 1], newChain[index]] = [newChain[index], newChain[index - 1]]
                            return newChain
                          }
                          return c
                        })}
                        className={`p-1 hover:bg-muted rounded ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Move up"
                        disabled={index === 0}
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setChainDraft(c => {
                          const newChain = [...c]
                          if (index < c.length - 1) {
                            [newChain[index], newChain[index + 1]] = [newChain[index + 1], newChain[index]]
                            return newChain
                          }
                          return c
                        })}
                        className={`p-1 hover:bg-muted rounded ${index === chainDraft.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Move down"
                        disabled={index === chainDraft.length - 1}
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <ModelCombobox
                  value=""
                  options={sameModalityModels
                    .filter(m => m.id !== primaryModelDbId && !chainDraft.includes(m.id))
                    .map(m => ({
                      value: m.id.toString(),
                      label: m.displayName,
                      sub: m.platform,
                    }))}
                  onSelect={(value) => setChainDraft(c => [...c, Number(value)])}
                  ariaLabel="Add model to fallback chain"
                  placeholder="Add a model..."
                  emptyText="No models available"
                  align="start"
                  triggerClassName="h-8 w-full max-w-[300px] border border-input bg-transparent px-3 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideMutation.mutate(chainDraft)}
                  disabled={setOverrideMutation.isPending || chainDraft.length === 0}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {setOverrideMutation.isPending ? 'Saving...' : 'Save chain'}
                </button>
                {fallbackOverride?.chain && fallbackOverride.chain.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearOverrideMutation.mutate()}
                    disabled={clearOverrideMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {clearOverrideMutation.isPending ? 'Clearing...' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            {/* Ways to use the API */}
            <ApiUsageBlock snippet={snippet} />
          </>
        )}
      </div>
    </div>
  )
}
