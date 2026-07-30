/**
 * SequencerTransport — play/stop + patroonlengte (±4 tellen = 1 maat).
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Plus, Minus } from 'lucide-react';
import { Button } from '../ui';
import { useSequencerStore } from '../../stores/sequencerStore';
import { sequencerEngine } from '../../services/SequencerEngine';
import {
  SEQ_MAX_STEPS,
  SEQ_MIN_STEPS,
  SEQ_STEP_INCREMENT,
} from '../../types/sequencer';

export default function SequencerTransport() {
  const { t } = useTranslation();
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const setIsPlaying = useSequencerStore((s) => s.setIsPlaying);
  const setLength = useSequencerStore((s) => s.setLength);
  const lengthSteps = useSequencerStore(
    (s) => s.sequences.find((seq) => seq.id === s.activeSequenceId)?.lengthSteps ?? 0
  );

  const handlePlay = useCallback(async () => {
    await sequencerEngine.start();
    setIsPlaying(true);
  }, [setIsPlaying]);

  const handleStop = useCallback(() => {
    sequencerEngine.stop();
    setIsPlaying(false);
  }, [setIsPlaying]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {isPlaying ? (
        <Button variant="secondary" size="lg" onClick={handleStop}>
          <Square className="w-5 h-5 mr-2" aria-hidden />
          {t('sequencer.stop')}
        </Button>
      ) : (
        <Button variant="primary" size="lg" onClick={handlePlay}>
          <Play className="w-5 h-5 mr-2" aria-hidden />
          {t('sequencer.play')}
        </Button>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLength(-SEQ_STEP_INCREMENT)}
          disabled={lengthSteps <= SEQ_MIN_STEPS}
          aria-label={t('sequencer.length.remove')}
        >
          <Minus className="w-4 h-4" aria-hidden />
        </Button>
        <span className="text-sm font-semibold text-text-main tabular-nums whitespace-nowrap">
          {t('sequencer.length.bars', {
            beats: lengthSteps,
            bars: lengthSteps / 4,
          })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLength(SEQ_STEP_INCREMENT)}
          disabled={lengthSteps >= SEQ_MAX_STEPS}
          aria-label={t('sequencer.length.add')}
        >
          <Plus className="w-4 h-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
