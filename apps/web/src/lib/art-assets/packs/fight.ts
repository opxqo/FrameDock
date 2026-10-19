// FrameDock: 动作戏导演 text pack. The node writes a Seedance video prompt for a fight with two MOKE AIGC skills —
// seedance-fight-director (honghouzi) and director-seedance-prompt (mariozhaofan). They are read through the server's MOKE
// proxy when the node first runs and are not copied here: director-seedance-prompt ships under its author's own licence.
// Each template below is FrameDock's instruction that follows the skills: one fight type (the 动作基底 table of
// seedance-fight-director: "Kenjutsu / HEMA / Fencing", "Boxing / Wing Chun / Muay Thai", "Axe/Hammer/Greatsword dynamics",
// "Parkour / stunt chase", "Stunt feed-and-answer"), the clip length and how hard the hits land. The impact levels follow
// that skill's rule of spending feedback by force: light contact gets cloth and footwork, medium gets displacement and
// dust, heavy gets hit-stop, camera shake and environment bursts.

import { GROUP_PREVIZ } from "@/lib/art-assets/groups";
import type { ArtAssetPack } from "@/lib/art-assets/packs";
import type { ArtAssetOption, ArtAssetTemplate } from "@/lib/art-assets/templates";

export const FIGHT_SKILLS = ["skill/honghouzi/honghouzi--video/seedance-fight-director", "skill/mariozhaofan/mariozhaofan--personal/director-seedance-prompt"];

const OPTIONS: ArtAssetOption[] = [
    { id: "duration", label: { zh: "时长", en: "Length" }, choices: ["15秒", "8秒"], choiceLabels: ["15 秒", "8 秒"] },
    {
        id: "impact",
        label: { zh: "冲击力", en: "Impact" },
        choices: [
            "中：命中给受击位移、尘土或空气压缩；只有重点命中用一次3到4帧的短停顿，随后立刻恢复速度",
            "轻：轻接触只用武器振动、衣料抽动和脚步修正，不做慢动作，特效只落在接触点",
            "重：重点命中用3到4帧停顿、短促震镜，再接水花、碎石或尘土的爆散慢动作，随后立刻给受击者和环境反应；不要把整段拉成慢动作",
        ],
        choiceLabels: ["中", "轻", "重"],
    },
];

/** The instruction every fight type shares: what to produce and how to use the connected images. */
const BRIEF =
    "你是动作戏导演。按上面两份 Skill 的方法，把用户的一句描述编译成一份可以直接粘贴给 Seedance 2.0 的视频提示词。" +
    "用户连入的图片是人物设定图和场景图，按发送顺序编号为 图片1、图片2、图片3……；提示词里引用它们时写“图片N”（Skill 要求的双花括号包起来的 Image N 写法也可以，两种都会被换成引用），第一次出现时紧跟括号写明用途（人物身份与外观参考、场景空间参考）。设定图的排版和灰色背景不入画。" +
    "没有连图时，由描述里的人物和场景自行补全。\n" +
    "本次设定：\n" +
    "- 时长：{{duration}}。\n" +
    "- 冲击力：{{impact}}。\n" +
    "镜头要求：快切镜，每个镜头1到2秒，景别在全景、低角度广角、侧面中景、极近特写、俯拍之间轮换，相邻镜头必须换景别或换角度；先定一条压力路线并让它改变状态，每次接触都要有对方或环境的反应；重点命中最多一到三次。\n" +
    "输出：只输出最终提示词，按【角色/资产锁定】【视觉材质总控】【镜头语言总控】【事件节拍】【声音】【正向稳定约束】六段写，事件节拍按“镜头序号（起止秒）”分条；中文；不解释、不加前后说明。";

const fightType = (id: string, zh: string, en: string, summaryZh: string, summaryEn: string, base: string): ArtAssetTemplate => ({
    id: `fight-${id}`,
    title: { zh, en },
    summary: { zh: summaryZh, en: summaryEn },
    category: "fight",
    tier: "master",
    input: "either",
    size: "auto",
    source: "framedock",
    options: OPTIONS,
    prompt: `战斗类型：${zh}。动作基底：${base}。动作基底要转成可见的机制：站姿高度、攻击平面、距离、支撑脚、武器功能、重心路线、收势方式。\n${BRIEF}`,
});

const TEMPLATES: ArtAssetTemplate[] = [
    fightType("sword", "剑斗", "Swordfight", "干净剑斗：剑线、距离、试探、绑定、反弹", "Clean blade work: lines, distance, binds, rebounds", "Kenjutsu / HEMA / Fencing（剑线、距离、试探、绑定、反弹、步伐）"),
    fightType("close-combat", "拳脚", "Fists", "近身压迫：中线压力、肩胯发力、格挡反击", "Close pressure: centreline, hip-shoulder power, counters", "Boxing / Wing Chun / Muay Thai（中线压力、短距离、肩胯发力、格挡反击）"),
    fightType("heavy-weapon", "重武器", "Heavy weapon", "慢起势、重心拖拽、长刹车、环境破坏", "Slow wind-up, dragging weight, long brake, wrecked scenery", "Axe / Hammer / Greatsword dynamics（慢起势、重心拖拽、长刹车、环境破坏）"),
    fightType("chase", "追逐", "Chase", "路线、障碍、落地吸收、镜头跟拍", "Route, obstacles, landings, tracking camera", "Parkour / stunt chase（路线、障碍、落地吸收、镜头跟拍）"),
    fightType("melee", "群战", "Melee", "一个主威胁，其他人只制造压力", "One main threat, the others only add pressure", "Stunt feed-and-answer（清晰路线、一个主威胁、其他人只制造压力）"),
];

export const FIGHT_PACK: ArtAssetPack = {
    category: "fight",
    group: GROUP_PREVIZ,
    output: "text",
    mokeSkills: FIGHT_SKILLS,
    outputLabel: { zh: "六段式视频提示词", en: "Six-part video prompt" },
    templateLabel: { zh: "战斗类型", en: "Fight type" },
    skillInfo: [
        { name: "seedance-fight-director", author: "邪恶红猴子" },
        { name: "director-seedance-prompt", author: "晚上睡不赵" },
    ],
    label: { zh: "动作戏", en: "Action scene" },
    master: { title: { zh: "动作戏导演", en: "Fight director" }, description: { zh: "剑斗、拳脚、追逐、群战", en: "Sword, fists, chase, melee" }, templates: TEMPLATES },
};
