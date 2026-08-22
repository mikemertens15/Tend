# Adds the WidgetKit extension target to the Capacitor-generated Xcode project.
#
# Run this after `npx cap add ios` on a fresh clone, and after any `npx cap sync`
# that rewrites the project file. Idempotent — re-running refreshes the target
# rather than duplicating it.
#
#   npm run ios:widget
#
# This exists because Capacitor generates the Xcode project, so anything hand-
# added in Xcode is one `cap sync` away from being lost. Keeping the extension's
# wiring as a script rather than as committed pbxproj edits is what makes the
# native project reproducible.

require 'xcodeproj'

# Relative to the repo root, so this runs the same on any machine.
PROJECT   = File.expand_path('App/App.xcodeproj', __dir__)
APP_ID    = 'com.mikemertens.tend'
WIDGET_ID = "#{APP_ID}.TendWidget"
GROUP_ID  = 'group.com.mikemertens.tend'

project = Xcodeproj::Project.open(PROJECT)
app = project.targets.find { |t| t.name == 'App' } or abort 'No App target'

# ---------------------------------------------------------------------------
# Shared sources — compiled into BOTH targets.
# ---------------------------------------------------------------------------
shared_group = project.main_group.find_subpath('Shared', true)
shared_group.set_source_tree('SOURCE_ROOT')
shared_group.set_path('Shared')

shared_files = %w[TendShared.swift TendTheme.swift].map do |name|
  shared_group.find_file_by_path(name) || shared_group.new_file(name)
end

# ---------------------------------------------------------------------------
# The bridge plugin belongs to the app target only.
# ---------------------------------------------------------------------------
app_group = project.main_group.find_subpath('App', true)
bridge = app_group.find_file_by_path('TendBridgePlugin.swift') || app_group.new_file('TendBridgePlugin.swift')
unless app.source_build_phase.files_references.include?(bridge)
  app.add_file_references([bridge])
end

# ---------------------------------------------------------------------------
# The widget extension target.
# ---------------------------------------------------------------------------
widget = project.targets.find { |t| t.name == 'TendWidget' }

if widget.nil?
  widget = project.new_target(:app_extension, 'TendWidget', :ios, '17.0')
  puts 'Created TendWidget target'
else
  puts 'TendWidget target already exists — refreshing'
end

widget_group = project.main_group.find_subpath('TendWidget', true)
widget_group.set_source_tree('SOURCE_ROOT')
widget_group.set_path('TendWidget')

widget_sources = %w[
  TendWidgetBundle.swift
  Provider.swift
  Chrome.swift
  AgendaWidget.swift
  BillsWidget.swift
].map { |n| widget_group.find_file_by_path(n) || widget_group.new_file(n) }

existing = widget.source_build_phase.files_references
widget.add_file_references((widget_sources + shared_files) - existing)

# The shared models must also compile into the app, so the bridge plugin can
# call Tend.store(...). Adding them to the app target is what makes the App
# Group write and the widget's read the same code.
app_existing = app.source_build_phase.files_references
app.add_file_references(shared_files - app_existing)

# ---------------------------------------------------------------------------
# Build settings.
# ---------------------------------------------------------------------------
widget.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER']            = WIDGET_ID
  s['PRODUCT_NAME']                         = '$(TARGET_NAME)'
  s['INFOPLIST_FILE']                       = 'TendWidget/Info.plist'
  s['CODE_SIGN_ENTITLEMENTS']               = 'TendWidget/TendWidget.entitlements'
  s['IPHONEOS_DEPLOYMENT_TARGET']           = '17.0'
  s['SWIFT_VERSION']                        = '5.0'
  s['TARGETED_DEVICE_FAMILY']               = '1,2'
  s['SKIP_INSTALL']                         = 'YES'
  s['CURRENT_PROJECT_VERSION']              = '1'
  s['MARKETING_VERSION']                    = '1.0'
  s['GENERATE_INFOPLIST_FILE']              = 'NO'
  s['LD_RUNPATH_SEARCH_PATHS']              = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['CODE_SIGN_STYLE']                      = 'Automatic'
  s['ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME'] = 'WidgetBackground'
end

# The app needs its entitlements file registered, and push requires the
# capability be declared in the project rather than only in the .entitlements.
app.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end

# ---------------------------------------------------------------------------
# Embed the extension in the app.
# ---------------------------------------------------------------------------
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
if embed.nil?
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
end

unless embed.files_references.include?(widget.product_reference)
  build_file = embed.add_file_reference(widget.product_reference)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }

# Capabilities, so Xcode's UI shows them as enabled rather than the target
# looking unconfigured when it's opened by hand.
attrs = project.root_object.attributes['TargetAttributes'] ||= {}
attrs[app.uuid] ||= {}
attrs[app.uuid]['SystemCapabilities'] = {
  'com.apple.ApplicationGroups.iOS' => { 'enabled' => 1 },
  'com.apple.Push'                  => { 'enabled' => 1 },
}
attrs[widget.uuid] ||= {}
attrs[widget.uuid]['SystemCapabilities'] = {
  'com.apple.ApplicationGroups.iOS' => { 'enabled' => 1 },
}

project.save
puts "Saved. Targets: #{project.targets.map(&:name).join(', ')}"
puts "Widget sources: #{widget.source_build_phase.files_references.map(&:display_name).join(', ')}"
puts "App shared:     #{(app.source_build_phase.files_references.map(&:display_name) & %w[TendShared.swift TendTheme.swift TendBridgePlugin.swift]).join(', ')}"
