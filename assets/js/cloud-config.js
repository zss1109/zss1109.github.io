/* --------------------------------------------------------------------------
   云服务公开配置（publicConfig）
   由「开通云服务」时返回的 publicConfig 生成，前端只允许使用这两个字段：
     - endpoint       云服务数据面地址（与应用发布域名一致）
     - publishableKey 标识「是哪个应用」，本身不含权限，服务端按来源域名校验
   注：重新发布应用后若域名变化，这里需要同步更新为新返回的值。
   -------------------------------------------------------------------------- */
window.WB_CLOUD_CONFIG = {
  endpoint: "https://personal-homepage-zss.app.workbuddy.host",
  publishableKey: "wbpk_a0YQwMAobFvov8B77GLHbi_IDqXOF7zjhaJAgfJuo7lMLfRp04F2hr8"
};