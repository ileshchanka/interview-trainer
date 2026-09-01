import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { TOPIC_TITLES, Topic } from '../../domain/models';
import { TRACK_TASKS_BLURB, TRACK_TITLES } from '../../domain/tracks';
import { dueCount, newCount } from '../../domain/session';
import { streakDays } from '../../domain/stats';
import { isMastered } from '../../domain/srs';
import { TrackService } from '../../shared/track.service';

interface DeckView {
  readonly topic: Topic;
  readonly title: string;
  readonly total: number;
  readonly due: number;
  readonly fresh: number;
  readonly mastered: number;
  readonly percent: number;
}

@Component({
  selector: 'app-decks-page',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './decks-page.html',
  styleUrl: './decks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecksPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);
  private readonly tracks = inject(TrackService);

  protected readonly titles = TOPIC_TITLES;
  protected readonly trackTitle = computed(() => TRACK_TITLES[this.tracks.track()]);
  protected readonly tasksBlurb = computed(() => TRACK_TASKS_BLURB[this.tracks.track()]);

  protected readonly decks = computed<DeckView[]>(() => {
    const states = this.progress.states();
    const now = Date.now();

    return this.tracks.topics().map((topic) => {
      const cards = this.content.cards().filter((card) => card.topic === topic);
      const mastered = cards.filter((card) => isMastered(states.get(card.id))).length;
      return {
        topic,
        title: TOPIC_TITLES[topic],
        total: cards.length,
        due: dueCount(cards, states, now),
        fresh: newCount(cards, states),
        mastered,
        percent: cards.length === 0 ? 0 : Math.round((mastered / cards.length) * 100),
      };
    });
  });

  /** Всего к работе прямо сейчас — по нему решается, показывать ли «Повторять всё». */
  protected readonly totalToDo = computed(() =>
    this.decks().reduce((sum, deck) => sum + deck.due + Math.min(deck.fresh, 10), 0),
  );

  protected readonly streak = computed(() => streakDays(this.progress.reviewTimes(), Date.now()));

  protected readonly tasksLeft = computed(() => {
    const solved = this.progress.solvedTasks();
    return this.content.tasks().filter((task) => !solved.has(task.id)).length;
  });
}
