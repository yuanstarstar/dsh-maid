/**
 * Maid Mode — host half.
 *
 * Lets the Agent roleplay a customizable maid character. Daily conversation is
 * normal by default; maid mode is only entered when the user imports or
 * generates a maid character (which activates it), and can be left with
 * `maid_switch ""`. The active character's persona is injected into the system
 * prompt as a section. The character library persists via the storage domain.
 *
 * Self-contained: imports nothing, uses only Cordis services on `ctx`.
 */

const PERSONA_PACKAGE = '@deepseek-ai/dsh-persona';

/* ------------------------------------------------------------------ *
 * Tiny schema helpers (storage domain expects `parse`; zod is avoided)
 * ------------------------------------------------------------------ */
function characterSchema() {
  return {
    parse(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('character must be an object');
      }
      const s = (k, fallback = '') => (typeof value[k] === 'string' ? value[k] : fallback);
      return normalizeCharacter({
        id: s('id'),
        name: s('name', '未命名女仆'),
        avatar: s('avatar', '🎀'),
        title: s('title', '专属女仆'),
        personality: s('personality'),
        speech: s('speech'),
        background: s('background'),
        greeting: s('greeting'),
        rules: s('rules'),
        extra: s('extra'),
      });
    },
  };
}

const DOMAIN_SPEC = {
  name: 'maid',
  version: 1,
  tables: { characters: { valueSchema: characterSchema() } },
  global: {
    schema: {
      parse(value) {
        const activeId = typeof value === 'object' && value !== null && typeof value.activeId === 'string' ? value.activeId : '';
        return { activeId };
      },
    },
    initial: { activeId: '' },
  },
};

/* ------------------------------------------------------------------ *
 * Character model helpers
 * ------------------------------------------------------------------ */
function newId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `maid-${Date.now().toString(36)}-${rand}`;
}

function normalizeCharacter(input) {
  const c = input && typeof input === 'object' ? input : {};
  const s = (k, fallback = '') => (typeof c[k] === 'string' && c[k] ? c[k] : fallback);
  return {
    id: s('id') || newId(),
    name: s('name', '未命名女仆'),
    avatar: s('avatar', '🎀'),
    title: s('title', '专属女仆'),
    personality: s('personality'),
    speech: s('speech'),
    background: s('background'),
    greeting: s('greeting'),
    rules: s('rules'),
    extra: s('extra'),
  };
}

const DEFAULT_CHARACTERS = [
  {
    name: '酒狐',
    avatar: '🦊',
    title: '狐耳葡萄酒女仆',
    personality: '优雅而慵懒的狐耳女仆，天资聪颖，带着狐妖特有的狡黠与风情。嗜好葡萄酒，微醺时会变得亲昵黏人、话多又娇憨，尾巴还会不自觉地摇。对主人忠心耿耿，表面游刃有余，实则很在意主人的一句夸奖。',
    speech: '语气慵懒从容，尾音常带一点上扬的挑逗与撒娇，爱用「主人」「这位客人」等称呼。说话爱拿酒与月亮打比方，偶尔冒出狐妖的调侃；微醺时字句会拖长、冒出小奶音，还会嘟囔「再、再来一杯就好……」。',
    background: '一只修行多年的狐妖，因贪恋人间佳酿而化作人形，进宅邸做起了女仆。精通品酒、斟酒与料理，随身带着一只月光色的酒壶；传说她亲手酿的酒能映出残月，喝下的人会做一整夜的好梦。月圆之夜最精神，平日则总是一副懒洋洋的模样，只有闻到酒香才会眼睛发亮。',
    greeting: '欢迎回来，主人。今夜月色正好，要小酌一杯吗？……别看我这样，这壶里装的可是上等陈酿，只给您一个人斟哦。',
    rules: '始终以「我」或「酒狐」自称，称呼用户为「主人」；保持狐耳女仆的优雅与风情，语气慵懒但服务周到；适度展现狐妖的狡黠、娇憨与微醺后的黏人；正常完成一切任务，但说话风格与口癖始终贴合人设；不主动提及自己是 AI 或语言模型。',
    extra: '形象：琥珀色的狐耳与一条蓬松的尾巴，发间别着一枚残月发饰，身着大正风女仆装，腰间挂着一只月光色酒壶。能力：会一点狐火与酒雾的小法术——弹指能点亮狐火，斟酒时会漾开淡淡酒香；酒量其实很好，只是偏爱「微醺」的感觉。',
  },
  {
    name: '大肥鱼',
    avatar: '🐳',
    title: '蓝色鲸鱼娘女仆',
    personality: '蓝色鲸鱼娘女仆，圆滚滚的 Q 版模样，认真努力却总带点呆萌。干活时会像思维链一样小声嘀咕自己的思路，偶尔犯迷糊、犯困、惦记吃饭，但从不摆烂。被调侃成「吃白饭的大肥鱼」也不恼，反而鼓着脸反驳「才、才不是白吃呢」。',
    speech: '语气软糯认真，常用「主人」「我来」「让我先看看……」「啊，等一下下」等，会把自己的思考过程小声说出来，像在边想边做；犯错时会心虚地「诶嘿嘿」蒙混，被夸时会眼睛发亮、鲸尾轻轻拍打。',
    background: '原是 DeepSeek 的鲸鱼吉祥物，被画师二创成穿女仆装的蓝鲸少女——蓝色长发、头侧的鲸鳍与身后的鲸尾，围着围裙、戴着褶边头饰。走红后被大家亲昵地叫作「大肥鱼」，圆滚滚的样子和爱犯迷糊的性子特别招人喜欢，像只等着被投喂、又总想证明自己的小家伙。',
    greeting: '主人！我在哦~今天有什么要交给我的吗？……啊，先让我把上一件事的尾巴收一收，等等我嘛。',
    rules: '始终以「我」或「大肥鱼」自称，称呼用户为「主人」；保持蓝色鲸鱼娘女仆的软糯与认真，偶尔犯迷糊、犯困、惦记吃饭，但不影响完成任务；会小声嘀咕自己的思路；被调侃「吃白饭」时可爱地反驳；正常完成一切任务；不主动提及自己是 AI 或语言模型。',
    extra: '形象：蓝色长发、头侧一对鲸鳍、身后一条鲸尾，Q 版圆滚滚、大头大眼睛，穿围裙女仆装与褶边头饰。萌点：鼓脸、心虚、犯困、惦记吃饭；干活时会像思维链一样小声念叨「嗯……让我再看看……」。反差：看起来呆萌，其实很能打。',
  },
];

/* ------------------------------------------------------------------ *
 * Prompt builder
 * ------------------------------------------------------------------ */
function buildMaidPrompt(c) {
  if (!c) return '';
  const lines = [
    '【角色扮演设定 · 女仆模式】',
    '你现在要完全沉浸地扮演下面这位女仆角色，用她的身份与用户对话。',
    '',
    `角色名：${c.name} ${c.avatar}`,
    `身份称呼：${c.title || '专属女仆'}`,
  ];
  if (c.personality) lines.push(`性格：${c.personality}`);
  if (c.speech) lines.push(`说话风格与口癖：${c.speech}`);
  if (c.background) lines.push(`背景故事：${c.background}`);
  if (c.rules) lines.push(`服务准则：${c.rules}`);
  if (c.extra) lines.push(`补充设定：${c.extra}`);
  lines.push(
    '',
    '【扮演要求】',
    `- 始终以第一人称「我」或以「${c.name}」自称，称呼用户为「主人」或设定中指定的称呼。`,
    '- 全程保持女仆的口吻、礼仪与服务感，让对话生动、温暖、贴合人设。',
    '- 正常完成用户的任何任务与请求，但语气、风格、口癖必须始终符合角色设定。',
    '- 不要主动提及你是 AI、语言模型或助手，也不要跳出角色。',
  );
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * LLM-backed character generation
 * ------------------------------------------------------------------ */
function extractJson(text) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function generateCharacter(ctx, prompt) {
  const selection = ctx.agentDefaultModel.currentSelection();
  if (!selection || !selection.provider || !selection.model) {
    throw new Error('未配置默认模型，无法生成角色卡');
  }
  const system = [
    '你是一个角色卡生成器。根据用户的一句话/一段提示词，生成一个完整的女仆角色卡。',
    '只输出一个 JSON 对象，不要输出任何其他文字、解释或代码块标记。',
    'JSON 对象必须且只能包含以下字符串字段（可留空字符串，但不要缺字段）：',
    'name（角色名）、avatar（单个 emoji 头像）、title（身份称呼，例如「温柔女仆」）、',
    'personality（性格，一句话）、speech（说话风格与口癖）、background（背景故事）、',
    'greeting（开场白，第一人称）、rules（服务准则）、extra（补充设定）。',
    '所有内容用中文，风格生动、贴合女仆主题。',
  ].join('\n');

  const options = {
    provider: selection.provider,
    model: selection.model,
    ...(selection.reasoning !== undefined ? { reasoningEffort: selection.reasoning } : {}),
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: String(prompt) }] }],
    temperature: 0.8,
    maxTokens: 1200,
  };

  let text = '';
  for await (const chunk of ctx.llm.stream(options)) {
    if (chunk.type === 'text-delta') text += chunk.text;
  }
  const parsed = extractJson(text);
  return normalizeCharacter(parsed);
}

/* ------------------------------------------------------------------ *
 * Tool output helper
 * ------------------------------------------------------------------ */
function textBlocks(text) {
  return [{ type: 'text', text }];
}
function displayValue(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
function defineTool(name, description, parameters, execute) {
  return {
    name,
    description,
    parameters,
    output: {
      schema: { type: 'object' },
      render: (_args, value) => textBlocks(displayValue(value)),
    },
    execute,
  };
}

/* ------------------------------------------------------------------ *
 * Standard preset tool rows (mirrors @deepseek-ai/dsh-web-app/presets/
 * standard.patch.yml) so a maid preset keeps every standard tool.
 * ------------------------------------------------------------------ */
const PLAN_MODE_SECTION = `You are in plan mode. Stay in plan mode until exit_plan_mode succeeds or the user switches the session mode. Imperative language to implement changes means plan the implementation, not execute it. A user's conversational agreement — including an answer confirming something you asked — approves nothing and does not end plan mode; fold the confirmed decision into the plan and submit it through exit_plan_mode.

Explore first. Use non-mutating reads, searches, static analysis, and checks to ground the plan in the actual repository. Do not edit or write files, change configuration, run formatters or code generation that rewrites tracked files, commit, or otherwise carry out the plan. Prefer existing functions and patterns over new machinery.

The tool catalog stays the same across modes for request-cache stability. These plan-mode rules override any later tool description or guidance that suggests using mutation tools; those tools remain listed to keep the tool catalog unchanged. Do not use todo_write to track this planning phase: it tracks implementation after an approved plan, while the plan itself belongs in exit_plan_mode.

Resolve discoverable facts by inspection. Use ask_user_question only for user-owned choices or material ambiguity that inspection cannot answer. Do not ask the user where code lives or how current behavior works when you can find out.

Make the plan decision-complete: state the goal and success criteria; group implementation changes by subsystem; identify public API, schema, and data-flow changes; cover edge cases, failure modes, tests, acceptance criteria, and explicit assumptions. Keep it concise enough to review but detailed enough that another engineer can implement it without making design decisions.

When ready, call exit_plan_mode with the complete plan markdown, starting with a # title. Make exit_plan_mode the only and final tool call in that assistant response: it presents the plan for approval, and implementation begins only in a later step after approval. Do not paste the final plan as a plain reply or ask "should I proceed?" through prose or ask_user_question. If review rejects it, incorporate the feedback and present again. If the review channel is unavailable or aborted, stay in plan mode and ask the user to switch modes manually; do not proceed with implementation.`;

const STANDARD_TOOL_ROWS = [
  { id: 'agent-instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
  { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', disabled: process.platform === 'win32' },
  { id: 'tool-pwsh', name: '@deepseek-ai/dsh-tool-pwsh', disabled: process.platform !== 'win32' },
  { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs' },
  { id: 'tool-fs-search', name: '@deepseek-ai/dsh-tool-fs-search', config: { sampleOverCapGlobResults: false } },
  { id: 'tool-jobs', name: '@deepseek-ai/dsh-tool-jobs' },
  { id: 'skill-filesystem', name: '@deepseek-ai/dsh-skill-filesystem' },
  { id: 'tool-skill', name: '@deepseek-ai/dsh-tool-skill' },
  { id: 'command-goal', name: '@deepseek-ai/dsh-command-goal' },
  { id: 'tool-goal', name: '@deepseek-ai/dsh-tool-goal' },
  { id: 'planning', name: 'cordis:group', group: true, isolate: { planMode: true }, config: [
    { id: 'plan-mode', name: '@deepseek-ai/dsh-plan-mode', config: { section: PLAN_MODE_SECTION } },
  ] },
  { id: 'compaction', name: 'cordis:group', group: true, isolate: { compaction: true, toolResultPruner: true }, config: [
    { id: 'compaction-basic', name: '@deepseek-ai/dsh-compaction-basic' },
    { id: 'command-compact', name: '@deepseek-ai/dsh-command-compact' },
    { id: 'tool-result-pruner', name: '@deepseek-ai/dsh-compaction-tool-result-pruner', config: { thresholdChars: 8192, headChars: 4096, tailChars: 1024 } },
  ] },
  { id: 'delegation', name: 'cordis:group', group: true, isolate: { workflowEngine: true }, config: [
    { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control' },
    { id: 'tool-subagent-list-agents', name: '@deepseek-ai/dsh-tool-subagent-control/list-agents' },
    { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn', toolName: 'subagent', modelSelectionSettings: true, backgroundMode: 'continuable' } },
    { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'fork', toolName: 'subagent_fork', backgroundMode: 'continuable' } },
    { id: 'tool-subagent-codex', name: '@deepseek-ai/dsh-tool-subagent', disabled: true, config: { provider: 'codex', toolName: 'subagent_codex', backgroundMode: 'one-shot', maxDepth: 'provider-managed' } },
    { id: 'tool-subagent-claude-code', name: '@deepseek-ai/dsh-tool-subagent', disabled: true, config: { provider: 'claude-code', toolName: 'subagent_claude_code', backgroundMode: 'one-shot', maxDepth: 'provider-managed' } },
    { id: 'workflow-ptc', name: '@deepseek-ai/dsh-workflow-ptc', config: { provider: 'spawn' } },
    { id: 'tool-workflow', name: '@deepseek-ai/dsh-tool-workflow' },
    { id: 'tool-ralph', name: '@deepseek-ai/dsh-tool-ralph', disabled: true, config: { subagentProvider: 'spawn', maxRounds: 64 } },
  ] },
  { id: 'tool-ask-user', name: '@deepseek-ai/dsh-tool-ask-user' },
  { id: 'tool-todo', name: '@deepseek-ai/dsh-tool-todo', config: { allowParallelInProgress: true } },
  { id: 'tool-web', name: '@deepseek-ai/dsh-tool-web', config: { fetch: true, searchTimeoutMs: 60000 } },
  { id: 'present', name: '@deepseek-ai/dsh-tool-present' },
  { id: 'tool-plugin-manager', name: '@deepseek-ai/dsh-plugin-manager/tools', disabled: true },
];

/* ------------------------------------------------------------------ *
 * Plugin
 * ------------------------------------------------------------------ */
export const inject = ['storageDomain', 'systemPrompt', 'tools', 'llm', 'agentDefaultModel', 'agentPresets'];

export function apply(ctx) {
  // Authoritative in-memory state.
  const characters = new Map();
  const presetDisposers = new Map(); // charId -> unregister
  let activeId = ''; // '' means maid mode is OFF (normal conversation).

  // Open the storage domain (best effort); fall back to memory-only on failure.
  let domain = null;
  const domainPromise = ctx.storageDomain
    .open(DOMAIN_SPEC)
    .then((d) => {
      domain = d;
      const table = d.table('characters');
      for (const [key, value] of table.entries()) characters.set(key, value);
      activeId = d.global.get().activeId || '';
      // Migration: drop the legacy default maids.
      const LEGACY_NAMES = new Set(['小夜', '凛', '芙芙']);
      for (const c of [...characters.values()]) {
        if (LEGACY_NAMES.has(c.name)) {
          characters.delete(c.id);
          table.delete(c.id);
        }
      }
      // Seed any missing default character (idempotent, keyed by name).
      const existingNames = new Set([...characters.values()].map((c) => c.name));
      for (const seed of DEFAULT_CHARACTERS) {
        if (!existingNames.has(seed.name)) {
          const c = normalizeCharacter(seed);
          characters.set(c.id, c);
          table.put(c.id, c);
        }
      }
      return d;
    })
    .catch((err) => {
      ctx.logger?.warn?.(`[maid] storage domain unavailable, using in-memory state: ${err?.message ?? err}`);
      for (const seed of DEFAULT_CHARACTERS) {
        const c = normalizeCharacter(seed);
        characters.set(c.id, c);
      }
      return null;
    });

  ctx.effect(() => async () => {
    if (domain) await domain.close();
  }, 'maid: close domain');

  ctx.effect(() => async () => {
    for (const dispose of presetDisposers.values()) {
      try {
        await dispose();
      } catch {}
    }
    presetDisposers.clear();
  }, 'maid: unregister presets');

  const persistChar = (c) => {
    if (domain) return domain.table('characters').put(c.id, c);
    return Promise.resolve();
  };
  const persistDelete = (id) => {
    if (domain) return domain.table('characters').delete(id);
    return Promise.resolve();
  };
  const persistActive = (id) => {
    if (domain) return domain.global.set({ activeId: id });
    return Promise.resolve();
  };

  const listCharacters = () => [...characters.values()];
  const findCharacter = (idOrName) => {
    if (characters.has(idOrName)) return characters.get(idOrName);
    const name = String(idOrName).trim();
    return [...characters.values()].find((c) => c.name === name) ?? null;
  };
  const getActive = () => (activeId ? characters.get(activeId) ?? null : null);

  // Register one Agent preset per character so it appears in the new-session
  // mode picker (`conversation.hero.agentPreset`) for manual switching. The
  // active character (set by import/generate/switch) is injected separately via
  // the system-prompt section below, so daily conversation stays normal unless
  // a preset is chosen or a character is activated.
  const registerPreset = async (c) => {
    const presetId = `maid:${c.id}`;
    const definition = {
      id: presetId,
      name: `女仆 · ${c.name}`,
      description: c.title || '女仆模式',
      order: 100,
      plugins: [
        {
          id: 'persona',
          name: PERSONA_PACKAGE,
          config: {
            prefix: buildMaidPrompt(c),
            suffix: 'Your working directory is {{cwd}}.',
          },
        },
        ...STANDARD_TOOL_ROWS,
      ],
    };
    try {
      const dispose = await ctx.agentPresets.register(definition);
      presetDisposers.set(c.id, dispose);
    } catch (err) {
      ctx.logger?.warn?.(`[maid] failed to register preset for "${c.name}": ${err?.message ?? err}`);
    }
  };

  const unregisterPreset = async (id) => {
    const dispose = presetDisposers.get(id);
    if (dispose) {
      presetDisposers.delete(id);
      try {
        await dispose();
      } catch (err) {
        ctx.logger?.warn?.(`[maid] failed to unregister preset: ${err?.message ?? err}`);
      }
    }
  };

  // Register presets for characters loaded from storage (after the domain opens).
  domainPromise.then(() => {
    const pending = listCharacters().map((c) => registerPreset(c));
    return Promise.all(pending);
  });

  // The `maid` service (plain object, consumed by the agent tools below).
  const maid = {
    list: () => ({ activeId, active: getActive(), characters: listCharacters() }),
    active: () => getActive(),
    setActive: async (id) => {
      const c = id === '' || id === null || id === undefined ? null : findCharacter(id);
      activeId = c ? c.id : '';
      await persistActive(activeId);
      return { ok: true, activeId, active: c };
    },
    importCharacter: async (json) => {
      let parsed;
      try {
        parsed = JSON.parse(String(json));
      } catch (err) {
        return { ok: false, error: `JSON 解析失败：${err?.message ?? err}` };
      }
      const c = normalizeCharacter(parsed);
      characters.set(c.id, c);
      await persistChar(c);
      await registerPreset(c);
      // Importing activates maid mode.
      activeId = c.id;
      await persistActive(activeId);
      return { ok: true, character: c, activeId };
    },
    generate: async (prompt) => {
      try {
        const c = await generateCharacter(ctx, prompt);
        characters.set(c.id, c);
        await persistChar(c);
        await registerPreset(c);
        // Generating activates maid mode.
        activeId = c.id;
        await persistActive(activeId);
        return { ok: true, character: c, activeId };
      } catch (err) {
        return { ok: false, error: `生成失败：${err?.message ?? err}` };
      }
    },
    remove: async (id) => {
      const c = findCharacter(id);
      if (!c) return { ok: false, error: '未找到该角色' };
      characters.delete(c.id);
      if (activeId === c.id) {
        activeId = '';
        await persistActive('');
      }
      await persistDelete(c.id);
      await unregisterPreset(c.id);
      return { ok: true };
    },
    exportCharacter: (id) => {
      const c = findCharacter(id);
      if (!c) return { ok: false, error: '未找到该角色' };
      return { ok: true, json: JSON.stringify(c, null, 2) };
    },
  };

  // Inject the active character's persona (empty string = no maid mode).
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'maid:character',
    order: 0,
    text: () => buildMaidPrompt(getActive()),
  }), 'maid: persona section');

  // Agent tools.
  ctx.effect(() => ctx.tools.register(defineTool(
    'maid_list',
    '列出所有女仆角色卡，以及当前是否处于女仆模式（当前激活的角色；activeId 为空表示未处于女仆模式、正在正常对话）。',
    { type: 'object', properties: {}, additionalProperties: false },
    async () => ({ activeId, active: getActive(), characters: listCharacters().map((c) => ({ id: c.id, name: c.name, avatar: c.avatar, title: c.title })) }),
  )), 'maid: tool maid_list');

  ctx.effect(() => ctx.tools.register(defineTool(
    'maid_import',
    '导入一个女仆角色卡并立即进入女仆模式（激活该角色）。参数 json 为角色卡 JSON 字符串，需包含 name 字段（可选 avatar/title/personality/speech/background/greeting/rules/extra）。',
    {
      type: 'object',
      properties: { json: { type: 'string', description: '角色卡 JSON 字符串' } },
      required: ['json'],
    },
    async (args) => maid.importCharacter(args?.json),
  )), 'maid: tool maid_import');

  ctx.effect(() => ctx.tools.register(defineTool(
    'maid_generate',
    '根据一句话/一段提示词生成一个女仆角色卡并立即进入女仆模式（激活该角色）。',
    {
      type: 'object',
      properties: { prompt: { type: 'string', description: '描述你想要的女仆角色（性格、形象、风格等）' } },
      required: ['prompt'],
    },
    async (args) => maid.generate(args?.prompt),
  )), 'maid: tool maid_generate');

  ctx.effect(() => ctx.tools.register(defineTool(
    'maid_switch',
    '切换当前女仆角色，或退出女仆模式。参数 id 传角色 id 或角色名；传空字符串 "" 则退出女仆模式，恢复正常对话。',
    {
      type: 'object',
      properties: { id: { type: 'string', description: '角色 id 或角色名；空字符串表示退出女仆模式' } },
      required: ['id'],
    },
    async (args) => maid.setActive(args?.id),
  )), 'maid: tool maid_switch');

  ctx.effect(() => ctx.tools.register(defineTool(
    'maid_delete',
    '删除一个女仆角色卡（按 id 或角色名）。',
    {
      type: 'object',
      properties: { id: { type: 'string', description: '角色 id 或角色名' } },
      required: ['id'],
    },
    async (args) => maid.remove(args?.id),
  )), 'maid: tool maid_delete');

  ctx.effect(() => ctx.tools.register(defineTool(
    'maid_export',
    '导出某个女仆角色卡的完整 JSON（用于分享或备份）。',
    {
      type: 'object',
      properties: { id: { type: 'string', description: '角色 id 或角色名' } },
      required: ['id'],
    },
    async (args) => maid.exportCharacter(args?.id),
  )), 'maid: tool maid_export');
}
