<script lang="ts">
  import { onMount } from "svelte";

  import Schedule from "./Schedule.svelte";

  import { Course, TimeSlot } from "./types";
  import { permutations } from "./utilities";

  // TODO: Conflicts

  // https://github.com/sveltejs/svelte/issues/1591
  let loaded = false;

  const terms = ["Spring 2021", "Summer 2022", "Fall 2022", "Spring 2022"];
  let term;
  let lastTerm;

  const timeSlotRegex =
    /^(.+?) (?:([MTWRF]+) )?(\d{1,2}:\d{2} [AP]M) (\d{1,2}:\d{2} [AP]M)/;
  const courseRegex =
    /^([A-Z]{4}) (\d+) (\d+) (\d+\.\d+) (.+) ?\1 \2 \3(?: \d+ \/ \d+)?$/;
  let courses: Course[] = [];
  let minHours = 24;
  let maxHours = 0;
  let coursePromise;
  function parseCourses() {
    if (term === undefined || term === lastTerm) return;

    courses = [];
    minHours = 24;
    maxHours = 0;

    coursePromise = fetch(`courses/${term}.txt`).then(async (response) => {
      const raw_data = (await response.text()).replaceAll(/ +/g, " ");
      let lastTimeslot: RegExpExecArray | null = null;
      for (const line of raw_data.split("\n")) {
        let matches = timeSlotRegex.exec(line);
        if (matches !== null) {
          lastTimeslot = matches;
        } else {
          matches = courseRegex.exec(line);
          if (matches !== null) {
            const timeslot = new TimeSlot(lastTimeslot);
            courses.push(new Course(matches, timeslot));

            if (timeslot.async) continue;

            minHours = Math.min(
              minHours,
              Math.floor(timeslot.start.hours + timeslot.start.minutes / 60)
            );
            maxHours = Math.max(
              maxHours,
              Math.ceil(timeslot.end.hours + timeslot.end.minutes / 60)
            );
          }
        }
      }

      courses = courses;
      lastTerm = term;

      if (!parsedHash) parseHash();

      loaded = true;
    });
  }

  $: term, parseCourses();

  let generatedSchedules: Course[][] = [];
  let scheduleIndex = 0;
  $: currentSchedule =
    generatedSchedules.length == 0 ? [] : generatedSchedules[scheduleIndex];
  $: scheduleIndex = Math.min(
    scheduleIndex,
    Math.max(generatedSchedules.length - 1, 0)
  );

  let maxConflicts = 0;
  let optionalCourses = {};
  function generateSchedules(possibleCourses: Course[][]): Course[][] {
    const schedules = [];

    for (const permutation of permutations(
      ...possibleCourses.map((slots) => slots.length)
    )) {
      const schedule: Course[] = permutation
        .map((index, i) => possibleCourses[i][index])
        .filter((course) => course != null);
      const conflicts = schedule.filter((course) =>
        schedule.some((otherCourse) => course.checkConflict(otherCourse))
      ).length;

      if (conflicts > maxConflicts) {
        continue;
      }

      schedules.push(schedule);
    }

    function scoreSchedule(schedule: Course[]): number {
      return schedule.map((course) => course.score()).reduce((a, b) => a + b);
    }

    schedules.sort((a, b) => scoreSchedule(b) - scoreSchedule(a));

    return schedules;
  }

  let courseInput = "";
  let courseCodes = [];
  let courseError = "";
  $: (() => {
    courseError = "";

    courseCodes = courseInput
      .split("\n")
      .map((code) => code.trim().toUpperCase())
      .filter((code) => code.length !== 0);
    if (courseCodes.length === 0) {
      generatedSchedules = [];
      return;
    }

    const possibleCourses = courseCodes.map((code) =>
      courses.filter((course) => course.code == code)
    );

    for (const [index, code] of courseCodes.entries()) {
      if (!optionalCourses[code]) continue;

      possibleCourses[index].push(null);
    }

    for (const [i, courses] of possibleCourses.entries()) {
      if (courses.length == 0) {
        courseError = courseCodes[i] + " is an unknown course.";
        generatedSchedules = [];
        return;
      }
    }

    generatedSchedules = generateSchedules(possibleCourses);
  })();

  let sidebarOpen = true;

  let parsedHash = false;
  $: (() => {
    if (!parsedHash) return;

    const onlyOptional = Object.fromEntries(
      Object.entries(optionalCourses).filter(([_, optional]) => optional)
    );

    let hashParts = [];
    if (Object.keys(onlyOptional).length > 0) hashParts.push(onlyOptional);
    if (maxConflicts > 0 || hashParts.length > 0) hashParts.push(maxConflicts);
    if (courseInput.length > 0 || hashParts.length > 0)
      hashParts.push(courseInput);
    hashParts.push(term);
    hashParts.reverse();

    window.history.replaceState(
      null,
      null,
      hashParts.length === 0
        ? " "
        : "#" + hashParts.map((value) => JSON.stringify(value)).join(",")
    );
  })();

  function parseHash() {
    parsedHash = true;

    const hash = decodeURIComponent(location.hash);
    if (!hash.startsWith("#")) return;

    try {
    const json = JSON.parse(`[${hash.substring(1)}]`);
      term = json[0] ?? "";
      courseInput = json[1] ?? "";
      maxConflicts = json[2] ?? 0;
      optionalCourses = json[3] ?? {};
    } catch (error) {
      console.warn("Failed to parse hash:", error);
    }
  }

  window.addEventListener("hashchange", parseHash);
</script>

<div class="container" class:sidebar-open={sidebarOpen}>
  <div class="app">
    {#if !loaded}
      <div>Loading...</div>
    {:else}
      <Schedule schedule={currentSchedule} />
      <div style="display: flex; justify-content:center; gap: 5px;">
        <button
          on:click={() => {
            if (scheduleIndex !== 0) scheduleIndex--;
          }}>Back</button
        >
        {#if generatedSchedules.length > 0}
          <span style="align-self: center;"
            >{scheduleIndex + 1} of {generatedSchedules.length}</span
          >
        {:else}
          <span style="align-self: center;">? of ?</span>
        {/if}
        <button
          on:click={() => {
            if (scheduleIndex !== generatedSchedules.length - 1)
              scheduleIndex++;
          }}>Forward</button
        >
      </div>
    {/if}
  </div>
  <div class="sidebar">
    <div style="display: flex; flex-direction: column; gap: 5px;">
      <label for="term">What term are you taking?</label>
      <select style="align-self: flex-start;" bind:value={term}>
        {#each terms as term}
          <option value={term.replace(" ", "_").toLowerCase()}>{term}</option>
        {/each}
      </select>
      <label for="courses"
        >What courses are you looking to take? Put each course code on a
        separate line.</label
      >
      <textarea
        id="courses"
        style="resize: vertical;"
        rows="7"
        placeholder="GEND 123&#13;MATH 456"
        bind:value={courseInput}
      />
      <div class="course-error">{courseError}</div>
    </div>
    <div>
      <label for="conflicts">Max conflicting courses:</label>
      <input type="number" id="conflicts" min="0" bind:value={maxConflicts} />
    </div>
    <div>
      <div>Optional courses:</div>
      {#each courseCodes as code, index}
        <div>
          <input
            id={"course" + index}
            type="checkbox"
            bind:checked={optionalCourses[code]}
          />
          <label for={"course" + index}>{code}</label>
        </div>
      {/each}
    </div>
  </div>
  <div class="toggle-sidebar" on:click={() => (sidebarOpen = !sidebarOpen)}>
    <svg viewBox="-0.1 -0.1 1.2 1.2">
      <path
        d={sidebarOpen
          ? "M0.1,0.1 L0.9,0.9 M0.9,0.1 L0.1,0.9"
          : "M0.1,0.25 l0.8,0 M0.1,0.5 l0.8,0 M0.1,0.75 l0.8,0"}
        stroke="black"
        stroke-width="0.075"
      />
    </svg>
  </div>
</div>

<style>
  .container {
    display: contents;
  }

  .app {
    height: 100%;
    padding: 5px;
    display: grid;
    grid-template-rows: 1fr auto auto;
    gap: 5px;
    font-family: sans-serif;
  }

  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 20%;
    background: white;
    border-right: 1px solid black;
    padding: 5px;
    transition: left 0.25s;
    padding-top: 45px;

    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  :not(.sidebar-open) .sidebar {
    left: -20%;
  }

  .toggle-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    width: 40px;
  }

  input {
    max-width: 100%;
  }

  .course-error {
    color: red;
  }
</style>
