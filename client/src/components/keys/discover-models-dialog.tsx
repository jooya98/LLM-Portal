import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n'
import { toast } from '@/lib/toast'

// #488: relays add and drop models weekly, so keeping a custom endpoint's model
// list current by hand means re-running `curl .../v1/models | jq` every so
// often. Ask the endpoint or official platform instead, tick the ones to keep,
// register them in one call. Reads only the user's OWN endpoint with the user's
// OWN key, or the platform's upstream catalog.

export interface DiscoveredModel {
  id: string
  ownedBy: string | null
  registered: boolean
}

interface DiscoverResponse {
  baseUrl: string
  keyId?: number | null  // present for custom endpoints
  models: DiscoveredModel[]
  total: number
  registeredCount: number
  platform?: string      // present for official platforms
}

/** How the endpoint is named to the server: a saved key row, or a base URL the
 *  user is still typing (with the key they typed alongside it). */
export interface EndpointRef {
  keyId?: number
  baseUrl?: string
  apiKey?: string
}

export function DiscoverModelsDialog({
  open,
  onOpenChange,
  endpoint,
  platform,
  onRegistered,
}: {
  /**
   * Discover and register models from either a custom endpoint or an official platform.
   * Exactly one of `endpoint` or `platform` must be provided.
   */
  open: boolean
  onOpenChange: (open: boolean) => void
  endpoint?: EndpointRef
  platform?: string
  onRegistered?: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // Runtime guard for caller contract
  if ((!endpoint && !platform) || (endpoint && platform)) {
    throw new Error('DiscoverModelsDialog: exactly one of "endpoint" or "platform" must be provided')
  }

  // Only the ids the user ticked. Already-registered ones are rendered checked
  // and disabled without living here, so the list reads as "what this endpoint
  // will serve" while the Add button still counts only what is genuinely new.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [kind, setKind] = useState<'chat' | 'image' | 'audio' | 'embedding'>('chat')

  // A query, not a mutation: the dialog is mounted only while open, so the
  // fetch fires on mount and the component needs no reset effect.
  const discover = useQuery<DiscoverResponse>({
    queryKey: platform
      ? ['platform-discover-models', platform]
      : ['custom-endpoint-models', endpoint!.keyId ?? null, endpoint!.baseUrl ?? null],
    queryFn: () => {
      if (platform) {
        return apiFetch(`/api/keys/${platform}/discover-models`, { method: 'GET' })
      } else {
        return apiFetch('/api/keys/custom/discover-models', {
          method: 'POST',
          body: JSON.stringify(endpoint),
        })
      }
    },
    retry: false,
    gcTime: 0,
    staleTime: 0,
  })
  const models = discover.data?.models ?? []

  const register = useMutation<{ created: number }>({
    meta: { silenceToast: true },
    mutationFn: () => {
      if (platform) {
        return apiFetch(`/api/keys/${platform}/register-models`, {
          method: 'POST',
          body: JSON.stringify({ models: [...selected], kind }),
        })
      } else {
        return apiFetch('/api/keys/custom', {
          method: 'POST',
          body: JSON.stringify({
            ...(endpoint!.keyId === undefined ? { baseUrl: endpoint!.baseUrl } : { keyId: endpoint!.keyId }),
            ...(endpoint!.apiKey ? { apiKey: endpoint!.apiKey } : {}),
            models: [...selected],
          }),
        })
      }
    },
    onSuccess: (data) => {
      for (const key of ['keys', 'health', 'fallback', 'models']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(t('keys.modelsAdded', { count: data.created }))
      onOpenChange(false)
      onRegistered?.()
    },
  })

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectable = models.filter(m => !m.registered)
  const allSelected = selectable.length > 0 && selectable.every(m => selected.has(m.id))
  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev)
      for (const model of selectable) {
        if (allSelected) next.delete(model.id)
        else next.add(model.id)
      }
      return next
    })
  }

  const newCount = selected.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup maxWidth="max-w-xl">
        <DialogTitle>{t('keys.discoverTitle')}</DialogTitle>
        <p className="mt-1 text-xs text-muted-foreground">{t('keys.discoverHint')}</p>

        {platform && (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">{t('keys.customType')}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)} disabled={discover.isPending}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">{t('keys.customTypeChat')}</SelectItem>
                <SelectItem value="image">{t('keys.customTypeImage')}</SelectItem>
                <SelectItem value="audio">{t('keys.customTypeAudio')}</SelectItem>
                <SelectItem value="embedding">{t('keys.customTypeEmbedding')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {discover.isPending && (
          <p className="mt-4 text-xs text-muted-foreground">{t('common.loading')}</p>
        )}

        {discover.isError && (
          <p className="mt-4 text-xs text-destructive">{(discover.error as Error).message}</p>
        )}

        {discover.isSuccess && models.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">{t('keys.discoverEmpty')}</p>
        )}

        {models.length > 0 && (
          <>
            <label className="mt-4 flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={selectable.length === 0}
                onChange={toggleAll}
                className="size-4 accent-primary"
              />
              <span>{t('keys.discoverSelectAll')}</span>
            </label>
            <div className="mt-2 max-h-[45vh] overflow-y-auto rounded-2xl border divide-y">
              {models.map(model => (
                <label
                  key={model.id}
                  className={`flex items-center gap-2 px-3 py-2 text-xs ${model.registered ? 'bg-muted/40' : 'cursor-pointer hover:bg-muted/30'}`}
                >
                  <input
                    type="checkbox"
                    checked={model.registered || selected.has(model.id)}
                    disabled={model.registered}
                    onChange={() => toggle(model.id)}
                    className="size-4 accent-primary"
                  />
                  <code className="min-w-0 flex-1 truncate font-mono" title={model.id}>{model.id}</code>
                  {model.ownedBy && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">{model.ownedBy}</span>
                  )}
                  {model.registered && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {t('keys.discoverAlreadyAdded')}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </>
        )}

        {register.isError && (
          <p className="mt-3 text-xs text-destructive">{(register.error as Error).message}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => register.mutate()}
            disabled={newCount === 0 || register.isPending}
          >
            {newCount === 1 ? t('keys.addModel') : t('keys.addModels', { count: newCount })}
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
