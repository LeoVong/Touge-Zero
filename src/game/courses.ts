import type { CourseDef, CourseId, Seg } from "./types";

function path(segs: Seg[]): Seg[] {
  return segs;
}

export const COURSES: CourseDef[] = [
  {
    id: "kamui",
    name: "KAMUI PASS",
    nameJp: "神居峠",
    grade: "NOV",
    lengthLabel: "1.6 km",
    image: "/art/course-kamui.jpg",
    startY: 92,
    endY: 8,
    halfWidth: 4.0,
    fog: 0.0048,
    lampSpacing: 28,
    treeSpacing: 7,
    cliff: "none",
    segs: path([
      { t: "s", l: 70 },
      { t: "c", deg: 28, r: 42 },
      { t: "s", l: 48 },
      { t: "c", deg: -158, r: 16 },
      { t: "s", l: 36 },
      { t: "c", deg: 152, r: 15.5 },
      { t: "s", l: 52 },
      { t: "c", deg: -62, r: 30 },
      { t: "s", l: 40 },
      { t: "c", deg: 168, r: 14 },
      { t: "s", l: 32 },
      { t: "c", deg: -162, r: 14.5 },
      { t: "s", l: 58 },
      { t: "c", deg: 78, r: 26 },
      { t: "s", l: 44 },
      { t: "c", deg: -148, r: 16 },
      { t: "s", l: 64 },
      { t: "c", deg: 46, r: 34 },
      { t: "s", l: 80 },
      { t: "c", deg: -38, r: 36 },
      { t: "s", l: 96 },
    ]),
  },
  {
    id: "amagiri",
    name: "AMAGIRI",
    nameJp: "雨霧峠",
    grade: "INT",
    lengthLabel: "1.8 km",
    image: "/art/course-amagiri.jpg",
    startY: 110,
    endY: 6,
    halfWidth: 3.55,
    fog: 0.0072,
    lampSpacing: 36,
    treeSpacing: 5.5,
    cliff: "none",
    segs: path([
      { t: "s", l: 54 },
      { t: "c", deg: -42, r: 28 },
      { t: "s", l: 30 },
      { t: "c", deg: 170, r: 12.5 },
      { t: "s", l: 24 },
      { t: "c", deg: -166, r: 12 },
      { t: "s", l: 28 },
      { t: "c", deg: 155, r: 13 },
      { t: "s", l: 36 },
      { t: "c", deg: -88, r: 22 },
      { t: "s", l: 22 },
      { t: "c", deg: 172, r: 11.5 },
      { t: "s", l: 26 },
      { t: "c", deg: -150, r: 13.5 },
      { t: "s", l: 40 },
      { t: "c", deg: 58, r: 24 },
      { t: "s", l: 32 },
      { t: "c", deg: -164, r: 12.2 },
      { t: "s", l: 28 },
      { t: "c", deg: 140, r: 14 },
      { t: "s", l: 48 },
      { t: "c", deg: -72, r: 20 },
      { t: "s", l: 36 },
      { t: "c", deg: 48, r: 26 },
      { t: "s", l: 88 },
    ]),
  },
  {
    id: "kuzure",
    name: "KUZUREZAKA",
    nameJp: "崩坂",
    grade: "EXT",
    lengthLabel: "2.1 km",
    image: "/art/course-kuzure.jpg",
    startY: 128,
    endY: 4,
    halfWidth: 3.25,
    fog: 0.0038,
    lampSpacing: 42,
    treeSpacing: 9,
    cliff: "right",
    segs: path([
      { t: "s", l: 62 },
      { t: "c", deg: 36, r: 34 },
      { t: "s", l: 40 },
      { t: "c", deg: -172, r: 11.8 },
      { t: "s", l: 22 },
      { t: "c", deg: 168, r: 11.2 },
      { t: "s", l: 26 },
      { t: "c", deg: -96, r: 18 },
      { t: "s", l: 34 },
      { t: "c", deg: 176, r: 10.8 },
      { t: "s", l: 20 },
      { t: "c", deg: -158, r: 12 },
      { t: "s", l: 44 },
      { t: "c", deg: 64, r: 22 },
      { t: "s", l: 30 },
      { t: "c", deg: -170, r: 11 },
      { t: "s", l: 24 },
      { t: "c", deg: 148, r: 13 },
      { t: "s", l: 38 },
      { t: "c", deg: -54, r: 24 },
      { t: "s", l: 50 },
      { t: "c", deg: 160, r: 12.4 },
      { t: "s", l: 28 },
      { t: "c", deg: -132, r: 14 },
      { t: "s", l: 36 },
      { t: "c", deg: 78, r: 20 },
      { t: "s", l: 42 },
      { t: "c", deg: -44, r: 28 },
      { t: "s", l: 100 },
    ]),
  },
];

export function courseById(id: CourseId): CourseDef {
  return COURSES.find((c) => c.id === id) ?? COURSES[0];
}

export function coursePlan(course: CourseDef): { x: number; z: number }[] {
  let x = 0;
  let z = 0;
  let yaw = 0;
  const pts = [{ x, z }];
  const step = 8;
  for (const seg of course.segs) {
    if (seg.t === "s") {
      const n = Math.max(1, Math.round(seg.l / step));
      const ds = seg.l / n;
      for (let i = 0; i < n; i++) {
        x += -Math.sin(yaw) * ds;
        z += -Math.cos(yaw) * ds;
        pts.push({ x, z });
      }
    } else {
      const rad = (seg.deg * Math.PI) / 180;
      const arcLen = Math.abs(rad) * seg.r;
      const n = Math.max(3, Math.round(arcLen / step));
      const dyaw = rad / n;
      const ds = arcLen / n;
      for (let i = 0; i < n; i++) {
        yaw += dyaw;
        x += -Math.sin(yaw) * ds;
        z += -Math.cos(yaw) * ds;
        pts.push({ x, z });
      }
    }
  }
  return pts;
}
