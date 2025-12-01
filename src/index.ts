import { Router } from 'express';
import { Request, SamplerPresetResponse } from './types';
import path from 'node:path';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';

const ID = 'v2';
const SETTINGS_FILE = 'v2Settings.json';
const PRESET_DIR = 'v2ExperimentalSamplerPreset';

async function init(router: Router): Promise<void> {
  // @ts-ignore
  router.get('/settings', async (request: Request, response) => {
    try {
      const filePath = path.join(request.user.directories.root, SETTINGS_FILE);
      const fileContent = await readFile(filePath, 'utf8');
      const settings = JSON.parse(fileContent);
      response.json(settings);
    } catch (error) {
      // If file doesn't exist, return default empty settings
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        response.json({});
      } else {
        console.error('Error reading settings:', error);
        response.status(500).json({ error: 'Failed to read settings' });
      }
    }
  });

  // Save settings endpoint,
  // @ts-ignore
  router.post('/settings', async (request: Request, response) => {
    try {
      const settings = request.body;
      const filePath = path.join(request.user.directories.root, SETTINGS_FILE);
      await writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');
      response.json({ success: true });
    } catch (error) {
      console.error('Error saving settings:', error);
      response.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // @ts-ignore
  router.get('/v2ExperimentalSamplerPreset', async (request: Request, response) => {
    const baseDir = path.join(request.user.directories.root, PRESET_DIR);
    try {
      const entries = await readdir(baseDir, { withFileTypes: true });
      const presets: SamplerPresetResponse[] = [];
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const name = entry.name.slice(0, -5);
          const filePath = path.join(baseDir, entry.name);
          const content = await readFile(filePath, 'utf8');
          const presetData: Record<string, unknown> = JSON.parse(content);
          presets.push({ name, preset: presetData } as SamplerPresetResponse);
        }
      }
      response.json(presets);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        response.json([]);
      } else {
        console.error('Error reading presets:', error);
        response.status(500).json({ error: 'Failed to read presets' });
      }
    }
  });

  // @ts-ignore
  router.get('/v2ExperimentalSamplerPreset/:name', async (request: Request, response) => {
    const { name } = request.params;
    const baseDir = path.join(request.user.directories.root, PRESET_DIR);
    const filePath = path.join(baseDir, `${name}.json`);
    try {
      const content = await readFile(filePath, 'utf8');
      const presetData: Record<string, unknown> = JSON.parse(content);
      response.json({ name, preset: presetData } satisfies SamplerPresetResponse);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        response.status(404).json({ error: 'Preset not found' });
      } else {
        console.error('Error reading preset:', error);
        response.status(500).json({ error: 'Failed to read preset' });
      }
    }
  });

  // @ts-ignore
  router.post('/v2ExperimentalSamplerPreset', async (request: Request, response) => {
    const preset = request.body as SamplerPresetResponse;
    if (!preset?.name) {
      return response.status(400).json({ error: 'name is required in preset' });
    }
    const baseDir = path.join(request.user.directories.root, PRESET_DIR);
    await mkdir(baseDir, { recursive: true });
    const filePath = path.join(baseDir, `${preset.name}.json`);
    try {
      await writeFile(filePath, JSON.stringify(preset.preset, null, 2), 'utf8');
      response.json({ success: true });
    } catch (error) {
      console.error('Error saving preset:', error);
      response.status(500).json({ error: 'Failed to save preset' });
    }
  });

  // @ts-ignore
  router.delete('/v2ExperimentalSamplerPreset/:name', async (request: Request, response) => {
    const { name } = request.params;
    const baseDir = path.join(request.user.directories.root, PRESET_DIR);
    const filePath = path.join(baseDir, `${name}.json`);
    try {
      await unlink(filePath);
      response.sendStatus(204);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        response.status(404).json({ error: 'Preset not found' });
      } else {
        console.error('Error deleting preset:', error);
        response.status(500).json({ error: 'Failed to delete preset' });
      }
    }
  });
}

interface PluginInfo {
  id: string;
  name: string;
  description: string;
}

export default {
  init,
  exit: (): void => {},
  info: {
    id: ID,
    name: 'V2 Server',
    description: 'Allows you to connect to a V2 server',
  },
} as {
  init: (router: Router) => Promise<void>;
  exit: () => void;
  info: PluginInfo;
};
