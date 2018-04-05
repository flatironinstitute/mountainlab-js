"""
Setup Module to setup mltools package
"""
import setuptools

setuptools.setup(
    name='mltools',
    version='0.1.0t',
    description='Tools for integrating MountainLab with python',
    packages=setuptools.find_packages(),
    install_requires=[
        'requests'
    ]
)
