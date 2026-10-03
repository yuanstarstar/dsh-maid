window.__ModuleLoader__.load({
  id: '@local/dsh-maid',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function MaidSection() {
      return h('div', { style: { padding: '20px 24px 40px', maxWidth: 760, color: 'var(--dsw-alias-label-primary)', fontSize: 14, lineHeight: 1.6 } },
        h('div', { style: { fontSize: 18, fontWeight: 600, marginBottom: 12 } }, '女仆模式'),
        h('div', { style: { color: 'var(--dsw-alias-label-secondary)', marginBottom: 16 } },
          '让 Agent 扮演带角色设定的女仆。日常对话保持正常。'),
        h('div', { style: { marginBottom: 8 } },
          '进入女仆模式：新建对话时在左上角「模式」选择器选「女仆 · 酒狐 / 大肥鱼」；或对 Agent 说「导入这个角色…（粘贴 JSON）」「生成一个傲娇女仆」。'),
        h('div', { style: { marginBottom: 8 } },
          '退出女仆模式：在模式选择器选回「标准」，或对 Agent 说「退出女仆模式 / 关闭女仆模式」。'),
        h('div', { style: { color: 'var(--dsw-alias-label-secondary)' } },
          '其他：让 Agent 用 maid_list / maid_switch / maid_delete / maid_export 管理角色卡。'),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'maid',
          order: 60,
          label: () => '女仆模式',
        }, MaidSection));
      },
    };
  },
});
