# -*- coding: utf-8 -*-
"""检查麦克风设备"""

import pyaudio

p = pyaudio.PyAudio()
print('可用音频设备:')
for i in range(p.get_device_count()):
    info = p.get_device_info_by_index(i)
    if info['maxInputChannels'] > 0:
        name = info['name'][:50]
        channels = info['maxInputChannels']
        rate = info['defaultSampleRate']
        is_default = ' (默认)' if i == p.get_default_input_device_info()['index'] else ''
        print(f'  [{i}] {name} - 通道：{channels}, 采样率：{rate}{is_default}')

default = p.get_default_input_device_info()
print(f'\n默认输入设备：{default["name"][:50]}')
p.terminate()
