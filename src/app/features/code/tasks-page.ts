import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { CodeTask, LANGUAGE_LABELS, TOPIC_TITLES, Topic } from '../../domain/models';
import { TRACK_TASKS_BLURB } from '../../domain/tracks';
import { TrackService } from '../../shared/track.service';

@Component({
  selector: 'app-tasks-page',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatChipsModule],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);
  private readonly tracks = inject(TrackService);

  protected readonly topics = this.tracks.topics;
  protected readonly blurb = computed(() => TRACK_TASKS_BLURB[this.tracks.track()]);
  protected readonly titles = TOPIC_TITLES;
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
