<script lang="ts">
  import { crossfade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { days } from "./constants";
  import type { Course } from "./types";

  export let schedule: Course[] = [];

  $: getCourses = function (day): Course[] {
    return schedule.filter((course) =>
      day === "Asynchronous"
        ? course.timeslot.async
        : course.timeslot.days.includes(day)
    );
  };

  function hasConflict(course: Course, day: string) {
    return schedule.some(
      (otherCourse) =>
        otherCourse != course &&
        otherCourse.timeslot.days.includes(day) &&
        course.checkConflict(otherCourse)
    );
  }

  const [send, receive] = crossfade({
    //duration: (d) => Math.sqrt(d * 600),

    fallback(node, params) {
      const style = getComputedStyle(node);
      const opacity = parseFloat(style.opacity);

      return {
        duration: 800,
        easing: quintOut,
        css: (t) => `opacity: ${t * opacity};`,
      };
    },
  });
</script>

<div class="schedule">
  <div class="calendar">
    {#each days as day}
      <div class="day">
        <div class="day-name">{day}</div>
        <div style="position: relative;">
          {#each getCourses(day) as course (course.code)}
            {#key course.code + course.section}
              <div
                class="course"
                class:conflict={hasConflict(course, day)}
                in:receive={{ key: course.code + day }}
                out:send={{ key: course.code + day }}
                style="position: absolute; top: {course.timeslot.start.percent()}%; height: {course.timeslot.end.percent() -
                  course.timeslot.start.percent()}%;"
              >
                {#if hasConflict(course, day)}
                  <div>Conflict</div>
                {:else}
                  <div>{course.code} {course.section}</div>
                  <div>
                    {course.timeslot.start.format()} - {course.timeslot.end.format()}
                  </div>
                  <div>{course.credits}</div>
                {/if}
              </div>
            {/key}
          {/each}
        </div>
      </div>
    {/each}
    <div class="day">
      <div class="day-name">Asynchronous</div>
      <div style="position: relative;">
        {#each getCourses("Asynchronous") as course}
          <div class="course">
            <div>{course.code} {course.section}</div>
            <div>{course.credits}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .schedule {
    height: 100%;
    padding: 5px;
    display: grid;
    grid-template-rows: 1fr auto auto;
    gap: 5px;
    font-family: sans-serif;
  }

  .calendar {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
  }

  .day {
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .day:not(:last-child) {
    border-right: 1px solid rgb(200, 200, 200);
    padding-right: 10px;
  }

  .day-name {
    text-align: center;
    font-size: 150%;
    font-weight: bold;
    padding: 10px 0px;
  }

  .course {
    background: red;
    color: white;
    width: 100%;
    border-radius: 5px;
    padding: 5px;
    overflow-y: auto;

    transition: opacity 0.25s;
  }

  .course.conflict {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
  }
</style>
