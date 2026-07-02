import { useState } from 'react';
import { ChevronDown, Globe, Lock } from 'lucide-react';
import type { Visibility } from '@/hooks/useJournal';

const visibilityOptions: { value: Visibility; label: string; icon: typeof Globe }[] = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'private', label: 'Only me', icon: Lock },
];

const MAX_LEN = 500;

export function PostComposer({
  onSubmit,
  placeholder = "What's happening?",
  defaultVisibility = 'public',
  submitLabel = 'Post',
  autoFocus = false,
}: {
  onSubmit: (body: string, visibility: Visibility) => Promise<unknown>;
  placeholder?: string;
  defaultVisibility?: Visibility;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [posting, setPosting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    await onSubmit(draft, visibility);
    setDraft('');
    setPosting(false);
  };

  const remaining = MAX_LEN - draft.length;
  const currentOpt = visibilityOptions.find(o => o.value === visibility) ?? visibilityOptions[0];
  const Icon = currentOpt.icon;

  return (
    <form onSubmit={submit} className="px-6">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        className="w-full px-4 py-3 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors resize-none"
      />
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs text-white hover:bg-accent transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {currentOpt.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 min-w-[140px]">
                {visibilityOptions.map(opt => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setVisibility(opt.value); setPickerOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-secondary transition-colors first:rounded-t-xl last:rounded-b-xl ${visibility === opt.value ? 'text-white' : 'text-muted-foreground'}`}
                    >
                      <OptIcon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <span className={`text-xs ${remaining < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {remaining}
          </span>
        </div>
        <button
          type="submit"
          disabled={!draft.trim() || posting}
          className="px-5 py-2 bg-white text-black rounded-full font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors text-sm"
        >
          {posting ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
