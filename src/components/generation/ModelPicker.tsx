"use client";

import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import type { GenerationModel } from '../../types/generation';
import { generationModelPresentation, groupGenerationModels, isGenerationModelReady } from '../../lib/generation-models';
import { modelAvailability } from './GenerationPresentation';
import StudioDialog from './StudioDialog';
import './model-picker.css';

export default function ModelPicker({ models, selected, onChoose, onInspect, onClose, referenceOnly = false, currentQuoteCredits, returnFocusTo }: {
  models: GenerationModel[];
  selected: string;
  onChoose: (model: GenerationModel) => void;
  onInspect: (model: GenerationModel) => void;
  onClose: () => void;
  referenceOnly?: boolean;
  currentQuoteCredits?: number;
  returnFocusTo?: HTMLElement | null;
}) {
  const [query, setQuery] = useState('');
  const groups = groupGenerationModels(models, query, referenceOnly);
  return (
    <StudioDialog open onClose={onClose} title={referenceOnly ? 'Choose a reference-capable model' : 'Choose your model'} wide className="model-picker-dialog" returnFocusTo={returnFocusTo}>
      <div className="model-picker">
        <p className="studio-help">Find a model for your next idea. Starting costs are catalog estimates; your current quote sets the cost.</p>
        {models.length >= 8 ? (
          <label className="model-picker-search">
            <Search size={18} aria-hidden="true" />
            <input className="ui-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search models and capabilities" aria-label="Search models" />
          </label>
        ) : null}
        <div className="model-picker-groups">
          {groups.map(group => (
            <section key={group.id} aria-labelledby={`model-group-${group.id}`} className="model-picker-group">
              <h3 id={`model-group-${group.id}`}>{group.label}</h3>
              <ul>
                {group.models.map(model => {
                  const view = generationModelPresentation(model);
                  const ready = isGenerationModelReady(model);
                  const active = selected === model.id;
                  return (
                    <li key={model.id} className={`model-picker-card${active ? ' is-selected' : ''}${ready ? '' : ' is-unavailable'}`}>
                      <div className="model-picker-card-heading">
                        <div>
                          <h4>{model.displayName}</h4>
                          <p className="model-picker-native">{view.providerName ? `${view.providerName} · ` : ''}{view.nativeDisplayName}</p>
                        </div>
                        {active ? <span className="model-picker-selected"><Check size={14} aria-hidden="true" />{ready ? 'Selected' : 'Viewing'}</span> : null}
                      </div>
                      <p className="model-picker-description">{view.description}</p>
                      <ul className="model-picker-capabilities" aria-label={`${model.displayName} capabilities`}>
                        {view.descriptors.map(descriptor => <li key={descriptor}>{descriptor}</li>)}
                      </ul>
                      <div className="model-picker-card-footer">
                        <div className="model-picker-pricing">
                          <strong>{active && currentQuoteCredits !== undefined ? `${currentQuoteCredits} credits quoted` : Number.isFinite(model.startingCredits) ? `From ${model.startingCredits} credits` : 'Quote required'}</strong>
                          <span>{modelAvailability(model)}</span>
                        </div>
                        <div className="model-picker-actions">
                          {!ready ? <button type="button" className="ui-button secondary" onClick={() => onInspect(model)} aria-label={`View controls for ${model.displayName}`}>View controls</button> : null}
                          <button type="button" className={`ui-button${active ? ' secondary' : ''}`} disabled={!ready} onClick={() => onChoose(model)} aria-label={`Choose ${model.displayName}`} aria-pressed={active && ready}>
                            {ready ? active ? 'Selected' : 'Choose' : 'Unavailable'}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        {!groups.length ? <p className="studio-notice" role="status">{query ? 'No models match your search.' : 'No reference-capable model is in the current catalog.'}</p> : null}
        <p className="model-picker-footnote">Unavailable models can be inspected. Generation stays disabled and no credits are reserved.</p>
      </div>
    </StudioDialog>
  );
}
