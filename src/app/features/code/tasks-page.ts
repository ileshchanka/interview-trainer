import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { CodeTask, LANGUAGE_LABELS, Topic } from '../../domain/models';
import { LanguageService } from '../../shared/language.service';
import { TrackService } from '../../shared/track.service';

@Component({
  selector: 'app-tasks-page',
  imports: [MatIconModule, RouterLink, MatCardModule, MatButtonModule, MatChipsModule],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);
  private readonly tracks = inject(TrackService);

  private readonly i18n = inject(LanguageService);

  protected readonly t = this.i18n.t;
  protected readonly topics = this.tracks.topics;
  protected readonly blurb = computed(() => this.t().tracks.tasksBlurb[this.tracks.track()]);
  protected readonly languages = LANGUAGE_LABELS;
  protected readonly filter = signal<Topic | 'all'>('all');

  protected readonly solved = this.progress.solvedTasks;

  protected readonly tasks = computed<CodeTask[]>(() => {
    const filter = this.filter();
    const all = this.content.tasks();
    return filter === 'all' ? [...all] : all.filter((task) => task.topic === filter);
  });

  protected readonly solvedCount = computed(
    () => this.tasks().filter((task) => this.solved().has(task.id)).length,
  );

  protected setFilter(topic: Topic | 'all'): void {
    this.filter.set(topic);
  }
}
