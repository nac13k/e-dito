import type { SupportedUiLanguage } from './workspaceConfig.js'

type MainDictionary = {
  menu: {
    file: string
    openWorkspace: string
    openRecentWorkspace: string
    clearRecentWorkspaces: string
    noRecentWorkspaces: string
    edit: string
    undo: string
    redo: string
    pasteKeepFormat: string
    pastePlainText: string
    language: string
    languageSystem: string
    window: string
    help: string
    docs: string
    app: string
  }
  dialogs: {
    openWorkspaceTitle: string
    openExternalTitle: string
    openExternalMessage: string
    openExternalConfirm: string
    openExternalCancel: string
    openExternalDontAsk: string
  }
  workspace: {
    newDocumentBase: string
    newFolderBase: string
    duplicateSuffix: string
    newDocumentTitle: string
  }
  export: {
    saveDialogTitle: string
    canceled: string
    noDocuments: string
    genericError: string
    folderError: string
    projectError: string
    successPath: (path: string) => string
  }
}

const dictionaries: Record<SupportedUiLanguage, MainDictionary> = {
  'es-MX': {
    menu: {
      file: 'Archivo',
      openWorkspace: 'Abrir workspace...',
      openRecentWorkspace: 'Abrir workspace reciente',
      clearRecentWorkspaces: 'Limpiar recientes',
      noRecentWorkspaces: 'Sin workspaces recientes',
      edit: 'Editar',
      undo: 'Deshacer',
      redo: 'Rehacer',
      pasteKeepFormat: 'Pegar (mantener formato)',
      pastePlainText: 'Pegar como texto plano',
      language: 'Idioma',
      languageSystem: 'Sistema',
      window: 'Ventana',
      help: 'Ayuda',
      docs: 'Documentacion de E-Dito',
      app: 'Aplicacion',
    },
    dialogs: {
      openWorkspaceTitle: 'Abrir workspace',
      openExternalTitle: 'Abrir enlace externo',
      openExternalMessage: 'Este enlace se abrira en tu navegador por defecto.',
      openExternalConfirm: 'Abrir enlace',
      openExternalCancel: 'Cancelar',
      openExternalDontAsk: 'No volver a preguntar',
    },
    workspace: {
      newDocumentBase: 'nuevo-documento',
      newFolderBase: 'nueva-carpeta',
      duplicateSuffix: 'copia',
      newDocumentTitle: '# Nuevo documento\n',
    },
    export: {
      saveDialogTitle: 'Exportar PDF',
      canceled: 'Exportacion cancelada',
      noDocuments: 'No hay documentos markdown para exportar',
      genericError: 'No se pudo exportar PDF',
      folderError: 'No se pudo exportar PDF de carpeta',
      projectError: 'No se pudo exportar PDF de proyecto',
      successPath: (path) => `PDF exportado en ${path}`,
    },
  },
  'en-US': {
    menu: {
      file: 'File',
      openWorkspace: 'Open Workspace...',
      openRecentWorkspace: 'Open Recent Workspace',
      clearRecentWorkspaces: 'Clear Recent Workspaces',
      noRecentWorkspaces: 'No Recent Workspaces',
      edit: 'Edit',
      undo: 'Undo',
      redo: 'Redo',
      pasteKeepFormat: 'Paste (Keep Format)',
      pastePlainText: 'Paste as Plain Text',
      language: 'Language',
      languageSystem: 'System',
      window: 'Window',
      help: 'Help',
      docs: 'E-Dito Docs',
      app: 'App',
    },
    dialogs: {
      openWorkspaceTitle: 'Open Workspace',
      openExternalTitle: 'Open External Link',
      openExternalMessage: 'This link will open in your default browser.',
      openExternalConfirm: 'Open Link',
      openExternalCancel: 'Cancel',
      openExternalDontAsk: 'Do not ask again',
    },
    workspace: {
      newDocumentBase: 'new-document',
      newFolderBase: 'new-folder',
      duplicateSuffix: 'copy',
      newDocumentTitle: '# New document\n',
    },
    export: {
      saveDialogTitle: 'Export PDF',
      canceled: 'Export canceled',
      noDocuments: 'No markdown documents available to export',
      genericError: 'Could not export PDF',
      folderError: 'Could not export folder PDF',
      projectError: 'Could not export project PDF',
      successPath: (path) => `PDF exported to ${path}`,
    },
  },
}

export const getMainI18n = (language: SupportedUiLanguage) => dictionaries[language]
