import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { TOPIC_TITLES } from '../../domain/models';
import { TRACK_TITLES } from '../../domain/tracks';
import { streakDays, topicProgress, weakSpots } from '../../domain/stats';
import { TrackService } from '../../shared/track.service';

@Component({
  selector: 'app-stats-page',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);
  private readonly tracks = inject(TrackService);

  protected readonly titles = TOPIC_TITLES;
  protected readonly trackTitle = computed(() => TRACK_TITLES[this.tracks.track()]);

  protected readonly progressByTopic = computed(() =>
    topicProgress(this.content.cards(), this.progress.states(), Date.now(), this.tracks.topics()),
  );

  protected readonly weak = computed(() =>
    weakSpots(this.content.cards(), this.progress.states(), 6),
  );

  protected readonly streak = computed(() => streakDays(this.progress.reviewTimes(), Date.now()));

  protected readonly totals = computed(() => {
    const rows = this.progressByTopic();
    return {
      total: rows.reduce((sum, row) => sum + row.total, 0),
      seen: rows.reduce((sum, row) => sum + row.seen, 0),
      mastered: rows.reduce((sum, row) => sum + row.mastered, 0),
      due: rows.reduce((sum, row) => sum + row.due, 0),
    };
  });

  protected readonly tasks = computed(() => {
    // Попытки в хранилище лежат общей кучей по всем трекам, а экран показывает
    // один. Без пересечения с задачами трека счётчик выдавал бы «2 из 21»,
    // засчитывая сюда решённое в вебе.
    const ids = new Set(this.content.tasks().map((task) => task.id));
    const attempts = this.progress.attempts().filter((attempt) => ids.has(attempt.taskId));
    const solved = new Set(attempts.filter((a) => a.passed).map((a) => a.taskId));
    return {
      total: ids.size,
      solved: solved.size,
      attempts: attempts.length,
      // Доля попаданий с первого предъявления интересна больше, чем всего попыток:
      // она показывает, угадывается ли ответ или действительно понимается.
      accuracy:
        attempts.length === 0
          ? null
          : Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100),
    };
  });

  protected async reset(): Promise<void> {
    if (confirm('Удалить весь прогресс? Действие необратимо.')) {
      await this.progress.reset();
    }
  }

  protected percent(seen: number, total: number): number {
    return total === 0 ? 0 : Math.round((seen / total) * 100);
  }
}
